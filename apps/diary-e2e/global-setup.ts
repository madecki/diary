import { execSync, spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

// apps/diary-e2e is 2 levels deep from the monorepo root
const ROOT_DIR = join(__dirname, "../..");
const STATE_FILE = join(__dirname, ".e2e-state.json");
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://diary:diary@localhost:54320/diary_e2e";

// Use dedicated test ports so the production app on 4280/4281 is never disturbed
const FRONTEND_PORT = 4282;
const BACKEND_PORT = 4283;

// Dedicated backup dir for e2e tests — deterministic path, gitignored via diary-backups/
export const E2E_BACKUP_DIR = join(__dirname, "test-backup");

interface E2EState {
  frontendPid?: number;
  backendPid?: number;
  workerPid?: number;
}

async function waitForApi(timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${BACKEND_PORT}/entries?limit=1`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`API did not become available within ${timeoutMs}ms`);
}

async function waitForPort(port: number, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok || res.status === 404) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Port ${port} did not become available within ${timeoutMs}ms`);
}

async function ensureE2EDatabase(): Promise<void> {
  const targetUrl = new URL(DATABASE_URL);
  const dbName = targetUrl.pathname.replace(/^\//, "");
  if (!dbName) throw new Error("E2E database name is missing");

  const adminUrl = new URL(DATABASE_URL);
  adminUrl.pathname = "/postgres";

  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

function killProcessOnPort(port: number): void {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    // ignore
  }
}

function cleanupPreviousRun(): void {
  if (existsSync(STATE_FILE)) {
    try {
      const raw = execSync(`cat "${STATE_FILE}"`).toString();
      const state: E2EState = JSON.parse(raw);
      for (const pid of [state.frontendPid, state.backendPid, state.workerPid]) {
        if (pid) {
          try { process.kill(pid, "SIGKILL"); } catch { /* already dead */ }
        }
      }
    } catch { /* corrupted state */ }
    unlinkSync(STATE_FILE);
  }
  killProcessOnPort(FRONTEND_PORT);
  killProcessOnPort(BACKEND_PORT);
}

function startProcess(
  command: string,
  args: string[],
  cwd: string,
  extraEnv: Record<string, string> = {},
): ChildProcess {
  const proc = spawn(command, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  proc.stdout?.on("data", (d) => {
    const line = d.toString().trim();
    if (line) console.log(`[${args.join(" ")}] ${line}`);
  });
  proc.stderr?.on("data", (d) => {
    const line = d.toString().trim();
    if (line) console.error(`[${args.join(" ")}] ${line}`);
  });
  return proc;
}

export default async function globalSetup(): Promise<void> {
  console.log("\n🚀 E2E Setup — starting full stack\n");

  cleanupPreviousRun();

  console.log("🐳 Starting Docker containers...");
  execSync("docker compose -f infra/docker-compose.yml up -d", {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  console.log("⏳ Waiting for Postgres...");
  const adminUrl = new URL(DATABASE_URL);
  adminUrl.pathname = "/postgres";
  let retries = 0;
  while (retries < 15) {
    try {
      const client = new pg.Client({ connectionString: adminUrl.toString() });
      await client.connect();
      await client.end();
      break;
    } catch {
      retries++;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (retries === 15) throw new Error("Postgres did not become available");

  await ensureE2EDatabase();

  console.log("📦 Running migrations...");
  execSync("pnpm db:migrate:deploy", {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });

  console.log("🌱 Seeding reference data...");
  execSync("pnpm db:seed", {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
  });

  console.log("🗑️  Resetting database...");
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("TRUNCATE TABLE entries RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE outbox_events RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE note_folders RESTART IDENTITY CASCADE");
  } finally {
    await client.end();
  }

  console.log("🔧 Building shared packages...");
  execSync("pnpm --filter @diary/shared build", { cwd: ROOT_DIR, stdio: "inherit" });

  console.log("🚀 Starting diary-api...");
  const backendProc = startProcess("pnpm", ["--filter", "diary-api", "dev"], ROOT_DIR, {
    DATABASE_URL,
    PORT: String(BACKEND_PORT),
    CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
  });

  console.log("🚀 Starting diary-web...");
  const frontendProc = startProcess("pnpm", ["--filter", "diary-web", "dev:e2e"], ROOT_DIR, {
    NEXT_PUBLIC_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
    NEXT_DIST_DIR: ".next-e2e",
  });

  console.log("🚀 Starting diary-worker...");
  const workerProc = startProcess(
    "pnpm",
    ["--filter", "diary-worker", "dev"],
    ROOT_DIR,
    { BACKUP_DIR: E2E_BACKUP_DIR, DATABASE_URL },
  );

  writeFileSync(
    STATE_FILE,
    JSON.stringify(
      { frontendPid: frontendProc.pid, backendPid: backendProc.pid, workerPid: workerProc.pid },
      null,
      2,
    ),
  );

  console.log("⏳ Waiting for API...");
  await waitForApi();
  console.log("⏳ Waiting for frontend...");
  await waitForPort(FRONTEND_PORT);

  console.log("\n✅ Full stack ready\n");
}
