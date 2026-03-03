import { execSync, spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

// apps/diary-e2e is 2 levels deep from the monorepo root
const ROOT_DIR = join(__dirname, "../..");
const STATE_FILE = join(__dirname, ".e2e-state.json");
const DATABASE_URL = "postgresql://diary:diary@localhost:54320/diary";

const FRONTEND_PORT = 4280;
const BACKEND_PORT = 4281;

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
  let retries = 0;
  while (retries < 15) {
    try {
      const client = new pg.Client({ connectionString: DATABASE_URL });
      await client.connect();
      await client.end();
      break;
    } catch {
      retries++;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (retries === 15) throw new Error("Postgres did not become available");

  console.log("📦 Running migrations...");
  execSync("pnpm db:migrate:deploy", { cwd: ROOT_DIR, stdio: "inherit" });

  console.log("🌱 Seeding reference data...");
  execSync("pnpm db:seed", { cwd: ROOT_DIR, stdio: "inherit" });

  console.log("🗑️  Resetting database...");
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query("TRUNCATE TABLE entries RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE outbox_events RESTART IDENTITY CASCADE");
  } finally {
    await client.end();
  }

  console.log("🔧 Building shared packages...");
  execSync("pnpm --filter @diary/shared build", { cwd: ROOT_DIR, stdio: "inherit" });

  console.log("🚀 Starting diary-api...");
  const backendProc = startProcess("pnpm", ["--filter", "diary-api", "dev"], ROOT_DIR);

  console.log("🚀 Starting diary-web...");
  const frontendProc = startProcess("pnpm", ["--filter", "diary-web", "dev"], ROOT_DIR);

  console.log("🚀 Starting diary-worker...");
  const workerProc = startProcess(
    "pnpm",
    ["--filter", "diary-worker", "dev"],
    ROOT_DIR,
    { BACKUP_DIR: E2E_BACKUP_DIR },
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
