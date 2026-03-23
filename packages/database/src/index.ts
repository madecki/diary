import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export { PrismaClient };
export { PrismaPg };
export type { Entry, OutboxEvent, EntryType, CheckInType } from "@prisma/client";

let instance: PrismaClient | undefined;

export function getPrismaClient(connectionString?: string): PrismaClient {
  if (!instance) {
    const url = connectionString ?? process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    const adapter = new PrismaPg({ connectionString: url });
    instance = new PrismaClient({ adapter });
  }
  return instance;
}

export async function disconnectPrisma(): Promise<void> {
  if (instance) {
    await instance.$disconnect();
    instance = undefined;
  }
}
