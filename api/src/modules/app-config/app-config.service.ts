import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { RedisPubSubService } from '@/core/databases/redis/redis-pubsub.service';
import {
  APP_CONFIG_KEYS,
  AppConfigKey,
  AppConfigValue,
  getDefinition,
  isAppConfigKey,
} from './registry/app-config.registry';
import { jsonEqual, mergeMissingDefaults } from './utils/app-config.utils';
import {
  AppConfigEntry,
  AppConfigHistoryEntry,
} from './interfaces/app-config.interface';

const INVALIDATE_CHANNEL = 'app-config:invalidate';
// Safety net when Redis pub/sub is unavailable: every instance re-reads the table at least this often.
const REFRESH_INTERVAL_MS = 30_000;

interface CachedEntry {
  value: unknown;
  version: number;
  invalid: boolean;
}

type ChangeListener = (key: AppConfigKey) => void;

@Injectable()
export class AppConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppConfigService.name);
  private readonly cache = new Map<AppConfigKey, CachedEntry>();
  private readonly listeners: ChangeListener[] = [];
  private readonly reportedInvalid = new Set<AppConfigKey>();
  private refreshTimer: NodeJS.Timeout | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: RedisPubSubService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureDefaults();
      await this.reload();
    } catch (error) {
      // A database hiccup at boot must not take the API down: defaults are served until the next refresh.
      this.logger.error(`AppConfig initial load failed: ${error?.message}`);
    }
    this.unsubscribe = this.pubsub.subscribe(INVALIDATE_CHANNEL, () => {
      void this.reload().catch((error) =>
        this.logger.warn(`AppConfig reload failed: ${error?.message}`),
      );
    });
    this.refreshTimer = setInterval(() => {
      void this.reload().catch(() => undefined);
    }, REFRESH_INTERVAL_MS);
    this.refreshTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.unsubscribe?.();
  }

  // Typed, synchronous and served from memory: safe on hot paths (usage recording, limit checks).
  // A stored value that no longer validates falls back to the registry default.
  get<K extends AppConfigKey>(key: K): AppConfigValue<K> {
    const entry = this.cache.get(key);
    if (!entry || entry.invalid) {
      if (entry?.invalid && !this.reportedInvalid.has(key)) {
        this.reportedInvalid.add(key);
        this.logger.error(
          `AppConfig "${key}" is invalid; serving the registry default`,
        );
      }
      return getDefinition(key).default as AppConfigValue<K>;
    }
    return entry.value as AppConfigValue<K>;
  }

  // Called with the changed key whenever any instance updates a value.
  onChange(listener: ChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  async list(): Promise<AppConfigEntry[]> {
    const rows = await this.prisma.appConfig.findMany({
      include: { updated_by: { select: { id: true, email: true, full_name: true } } },
    });
    const byKey = new Map(rows.map((row) => [row.key, row]));
    return APP_CONFIG_KEYS.map((key) => {
      const definition = getDefinition(key);
      const row = byKey.get(key);
      const parsed = row ? definition.schema.safeParse(row.value) : null;
      return {
        key,
        category: definition.category,
        description: definition.description,
        public: definition.public,
        value: row?.value ?? definition.default,
        default: definition.default,
        version: row?.version ?? 0,
        invalid: parsed ? !parsed.success : false,
        validation_error:
          parsed && !parsed.success ? parsed.error.message : null,
        updated_at: row?.updated_at ?? null,
        updated_by: row?.updated_by
          ? {
              id: row.updated_by.id,
              name: row.updated_by.full_name || row.updated_by.email,
            }
          : null,
      };
    });
  }

  async findOne(key: string): Promise<AppConfigEntry> {
    const entry = (await this.list()).find((item) => item.key === key);
    if (!entry) throw new NotFoundException(`Unknown config key: ${key}`);
    return entry;
  }

  async set<K extends AppConfigKey>(
    key: K,
    value: unknown,
    userId: string | null,
    expectedVersion: number,
  ): Promise<AppConfigEntry> {
    this.assertKey(key);
    const parsed = getDefinition(key).schema.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException({
        message: 'Invalid value for this setting',
        code: 'APP_CONFIG_INVALID',
        issues: parsed.error.issues,
      });
    await this.write(key, parsed.data, userId, expectedVersion);
    return this.findOne(key);
  }

  async reset(
    key: string,
    userId: string | null,
    expectedVersion?: number,
  ): Promise<AppConfigEntry> {
    this.assertKey(key);
    const current = await this.prisma.appConfig.findUnique({ where: { key } });
    await this.write(
      key,
      getDefinition(key).default,
      userId,
      expectedVersion ?? current?.version ?? 0,
    );
    return this.findOne(key);
  }

  async history(key: string, limit = 50): Promise<AppConfigHistoryEntry[]> {
    this.assertKey(key);
    const rows = await this.prisma.appConfigHistory.findMany({
      where: { key },
      orderBy: { created_at: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
    const userIds = [
      ...new Set(rows.map((row) => row.changed_by_id).filter(Boolean)),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, full_name: true },
    });
    const names = new Map(users.map((u) => [u.id, u.full_name || u.email]));
    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      old_value: row.old_value,
      new_value: row.new_value,
      changed_by: row.changed_by_id
        ? { id: row.changed_by_id, name: names.get(row.changed_by_id) ?? null }
        : null,
      created_at: row.created_at,
    }));
  }

  // Writes defaults for missing keys. For stored values that no longer validate (a field was added to the
  // schema), missing fields are deep-merged from the default; admin values are kept.
  async ensureDefaults(): Promise<void> {
    const rows = await this.prisma.appConfig.findMany();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    for (const key of APP_CONFIG_KEYS) {
      const definition = getDefinition(key);
      const row = byKey.get(key);
      if (!row) {
        await this.prisma.appConfig
          .create({ data: { key, value: definition.default as Prisma.InputJsonValue } })
          .catch(() => undefined); // another instance may have inserted it first
        continue;
      }
      if (definition.schema.safeParse(row.value).success) continue;

      const merged = mergeMissingDefaults(row.value, definition.default);
      if (
        jsonEqual(merged, row.value) ||
        !definition.schema.safeParse(merged).success
      )
        continue;
      await this.prisma.$transaction([
        this.prisma.appConfig.update({
          where: { key },
          data: {
            value: merged as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
        }),
        this.prisma.appConfigHistory.create({
          data: {
            key,
            old_value: row.value as Prisma.InputJsonValue,
            new_value: merged as Prisma.InputJsonValue,
          },
        }),
      ]);
      this.logger.log(`AppConfig "${key}": merged new default fields`);
    }
  }

  private async write(
    key: AppConfigKey,
    value: unknown,
    userId: string | null,
    expectedVersion: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.appConfig.findUnique({ where: { key } });
      const currentVersion = current?.version ?? 0;
      if (currentVersion !== expectedVersion)
        throw new ConflictException({
          message:
            'This setting was changed by someone else. Reload to see the latest value.',
          code: 'APP_CONFIG_VERSION_CONFLICT',
          current_version: currentVersion,
        });

      const json = value as Prisma.InputJsonValue;
      if (current) {
        // The version in the WHERE makes the write atomic against a concurrent editor.
        const updated = await tx.appConfig.updateMany({
          where: { key, version: currentVersion },
          data: { value: json, version: { increment: 1 }, updated_by_id: userId },
        });
        if (!updated.count)
          throw new ConflictException({
            message: 'This setting was changed by someone else. Reload to see the latest value.',
            code: 'APP_CONFIG_VERSION_CONFLICT',
          });
      } else {
        await tx.appConfig.create({
          data: { key, value: json, version: 1, updated_by_id: userId },
        });
      }
      await tx.appConfigHistory.create({
        data: {
          key,
          old_value: (current?.value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          new_value: json,
          changed_by_id: userId,
        },
      });
    });

    await this.reload();
    await this.pubsub.publish(INVALIDATE_CHANNEL, key);
  }

  private async reload(): Promise<void> {
    const rows = await this.prisma.appConfig.findMany();
    const changed: AppConfigKey[] = [];
    for (const row of rows) {
      if (!isAppConfigKey(row.key)) continue;
      const previous = this.cache.get(row.key);
      if (previous && previous.version === row.version) continue;
      const parsed = getDefinition(row.key).schema.safeParse(row.value);
      this.cache.set(row.key, {
        value: parsed.success ? parsed.data : null,
        version: row.version,
        invalid: !parsed.success,
      });
      if (parsed.success) this.reportedInvalid.delete(row.key);
      if (previous) changed.push(row.key);
    }
    for (const key of changed) this.emit(key);
  }

  private emit(key: AppConfigKey) {
    for (const listener of this.listeners) {
      try {
        listener(key);
      } catch (error) {
        this.logger.warn(`AppConfig listener failed: ${error?.message}`);
      }
    }
  }

  private assertKey(key: string): asserts key is AppConfigKey {
    if (!isAppConfigKey(key))
      throw new NotFoundException(`Unknown config key: ${key}`);
  }
}
