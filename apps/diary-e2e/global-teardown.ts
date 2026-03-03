import { execSync } from "node:child_process";
import { existsSync, unlinkSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { E2E_BACKUP_DIR } from "./global-setup";

const STATE_FILE = join(__dirname, ".e2e-state.json");

interface E2EState {
  frontendPid?: number;
  backendPid?: number;
  workerPid?: number;
}

function killProcessOnPort(port: number): void {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    // ignore
  }
}

function killProcess(pid: number | undefined, name: string): void {
  if (!pid) return;
  try {
    process.kill(pid, 0); // check if alive
    process.kill(-pid, "SIGTERM");
    console.log(`🛑 Stopped ${name} (PID: ${pid})`);
  } catch {
    console.log(`ℹ️  ${name} already stopped`);
  }
}

export default async function globalTeardown(): Promise<void> {
  console.log("\n🧹 E2E Teardown\n");

  if (existsSync(STATE_FILE)) {
    try {
      const state: E2EState = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      killProcess(state.backendPid, "diary-api");
      killProcess(state.frontendPid, "diary-web");
      killProcess(state.workerPid, "diary-worker");
    } catch { /* ignore */ }
    unlinkSync(STATE_FILE);
  }

  killProcessOnPort(4280);
  killProcessOnPort(4281);

  if (existsSync(E2E_BACKUP_DIR)) {
    rmSync(E2E_BACKUP_DIR, { recursive: true, force: true });
    console.log("🗑️  Cleaned up test backup dir");
  }

  console.log("✅ Teardown complete\n");
}
