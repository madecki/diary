/**
 * Assigns all pre-auth diary data to a specific user.
 *
 * Run this ONCE after you have registered your account via the shell app and
 * obtained your user ID (e.g. from GET /auth/v1/auth/me via the gateway).
 *
 * Usage:
 *   pnpm db:assign-owner <userId>
 *
 * What this does:
 *   - Sets ownerId on all entries where ownerId IS NULL
 *   - Sets ownerId on all emotions, triggers, projects, tags where ownerId = 'UNASSIGNED'
 *
 * This is a one-time migration. Running it again with the same userId is safe (no-op).
 * Running it with a different userId after data is already assigned will only affect
 * still-unassigned rows.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: pnpm db:assign-owner <userId>');
  console.error('Get your userId from: GET http://localhost:3000/auth/v1/auth/me');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Assigning legacy data to user: ${userId}`);

  const [entries, emotions, triggers, projects, tags] = await Promise.all([
    prisma.entry.updateMany({ where: { ownerId: null }, data: { ownerId: userId } }),
    prisma.emotion.updateMany({ where: { ownerId: 'UNASSIGNED' }, data: { ownerId: userId } }),
    prisma.trigger.updateMany({ where: { ownerId: 'UNASSIGNED' }, data: { ownerId: userId } }),
    prisma.project.updateMany({ where: { ownerId: 'UNASSIGNED' }, data: { ownerId: userId } }),
    prisma.tag.updateMany({ where: { ownerId: 'UNASSIGNED' }, data: { ownerId: userId } }),
  ]);

  console.log(`Done:`);
  console.log(`  entries:  ${entries.count}`);
  console.log(`  emotions: ${emotions.count}`);
  console.log(`  triggers: ${triggers.count}`);
  console.log(`  projects: ${projects.count}`);
  console.log(`  tags:     ${tags.count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
