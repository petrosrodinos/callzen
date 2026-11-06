import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';
import { REDIS_OPTIONS } from './redis.constants';

type Handler = (message: string) => void;

// Cross-instance messaging used to invalidate in-process caches (AppConfig, entitlements) on every API
// instance. Without Redis it degrades to local-only delivery, which is correct for a single instance.
@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private readonly handlers = new Map<string, Set<Handler>>();
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor(
    @Inject(REDIS_OPTIONS) private readonly options: RedisOptions | null,
  ) {}

  async publish(channel: string, message: string): Promise<void> {
    const publisher = this.getPublisher();
    if (!publisher) {
      this.deliver(channel, message);
      return;
    }
    try {
      await publisher.publish(channel, message);
    } catch (error) {
      this.logger.warn(`Publish on ${channel} failed: ${error?.message}`);
      this.deliver(channel, message);
    }
  }

  subscribe(channel: string, handler: Handler): () => void {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
      const subscriber = this.getSubscriber();
      subscriber
        ?.subscribe(channel)
        .catch((error) =>
          this.logger.warn(`Subscribe to ${channel} failed: ${error?.message}`),
        );
    }
    set.add(handler);
    return () => set.delete(handler);
  }

  async onModuleDestroy() {
    await Promise.all(
      [this.publisher, this.subscriber]
        .filter(Boolean)
        .map((client) => client.quit().catch(() => undefined)),
    );
  }

  private deliver(channel: string, message: string) {
    for (const handler of this.handlers.get(channel) ?? []) {
      try {
        handler(message);
      } catch (error) {
        this.logger.warn(`Handler on ${channel} failed: ${error?.message}`);
      }
    }
  }

  private getPublisher(): Redis | null {
    if (!this.options) return null;
    if (!this.publisher) this.publisher = this.createClient('publisher');
    return this.publisher;
  }

  private getSubscriber(): Redis | null {
    if (!this.options) return null;
    if (!this.subscriber) {
      this.subscriber = this.createClient('subscriber');
      this.subscriber.on('message', (channel: string, message: string) =>
        this.deliver(channel, message),
      );
    }
    return this.subscriber;
  }

  private createClient(name: string): Redis {
    const client = new Redis({
      ...this.options,
      // Pub/sub clients must keep retrying; BullMQ's options disable reconnects on error.
      reconnectOnError: () => true,
      lazyConnect: false,
    });
    client.on('error', (error) =>
      this.logger.warn(`Redis ${name} error: ${error?.message}`),
    );
    return client;
  }
}
