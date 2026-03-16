import pg from "pg";

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://diary:diary@localhost:54320/diary_e2e";

export async function resetDatabase(): Promise<void> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("TRUNCATE TABLE entries RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE outbox_events RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE note_folders RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE projects RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE tags RESTART IDENTITY CASCADE");
  } finally {
    await client.end();
  }
}

export async function getEntryCount(): Promise<number> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query("SELECT COUNT(*) as count FROM entries");
    return parseInt(result.rows[0]?.count ?? "0", 10);
  } finally {
    await client.end();
  }
}
