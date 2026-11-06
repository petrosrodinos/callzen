/* Idempotent seed: inserts every AppConfig key that is missing, with its registry default. Never overwrites
   admin edits. Safe to run on every deploy; the API also does this on boot (AppConfigService.ensureDefaults).
   Usage: npm run seed:staging  (or `npx prisma db seed` with DATABASE_URL set) */
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma';
import {
  APP_CONFIG_KEYS,
  getDefinition,
} from '../src/modules/app-config/registry/app-config.registry';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = new Set(
      (await prisma.appConfig.findMany({ select: { key: true } })).map((row) => row.key),
    );
    let created = 0;
    for (const key of APP_CONFIG_KEYS) {
      if (existing.has(key)) continue;
      await prisma.appConfig.create({
        data: { key, value: getDefinition(key).default as Prisma.InputJsonValue },
      });
      created += 1;
    }
    console.log(`AppConfig: ${created} key(s) created, ${existing.size} already present.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
