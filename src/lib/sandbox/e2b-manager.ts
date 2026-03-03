/**
 * E2B Sandbox Manager — Singleton that manages Firecracker microVM sandboxes.
 * Replaces WebContainers with full Linux VMs for code execution.
 *
 * Requires E2B_API_KEY in .env.local
 * Get one at: https://e2b.dev → Free Tier → API Keys
 */

import { Sandbox } from "@e2b/code-interpreter";

// ── Types ──

export type SandboxStatus =
  | "idle"
  | "booting"
  | "ready"
  | "installing"
  | "starting"
  | "running"
  | "error";

export interface SandboxEvent {
  type: "status" | "log" | "error" | "server-ready";
  status?: SandboxStatus;
  message?: string;
  url?: string;
}

interface ManagedSandbox {
  sandbox: Sandbox;
  status: SandboxStatus;
  previewUrl: string | null;
  createdAt: number;
  lastAliveCheck: number;
  packageJsonHash: string | null;
}

// ── Manager ──

const SANDBOX_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ALIVE_CHECK_COOLDOWN_MS = 10_000; // Don't re-check alive more than every 10s

// Simple hash for comparing package.json content
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

class E2BSandboxManager {
  private sandboxes: Map<string, ManagedSandbox> = new Map();

  private getApiKey(): string {
    const key = process.env.E2B_API_KEY;
    if (!key) {
      throw new Error(
        "E2B_API_KEY fehlt. Bitte in .env.local setzen.\n" +
        "Hol dir einen Key: https://e2b.dev → Free Tier → API Keys"
      );
    }
    return key;
  }

  /**
   * Quick check if a sandbox is still alive (cached for 10s).
   */
  private async isAlive(managed: ManagedSandbox): Promise<boolean> {
    const now = Date.now();
    // Skip check if we verified recently
    if (now - managed.lastAliveCheck < ALIVE_CHECK_COOLDOWN_MS) return true;
    try {
      await managed.sandbox.commands.run("echo alive", { timeoutMs: 5000 });
      managed.lastAliveCheck = now;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a sandbox exists and is running with a dev server.
   */
  async isRunning(projectId: string): Promise<{ running: boolean; url: string | null }> {
    const existing = this.sandboxes.get(projectId);
    if (!existing) return { running: false, url: null };
    
    const age = Date.now() - existing.createdAt;
    if (age >= SANDBOX_TIMEOUT_MS) {
      await this.kill(projectId);
      return { running: false, url: null };
    }

    const alive = await this.isAlive(existing);
    if (!alive) {
      this.sandboxes.delete(projectId);
      return { running: false, url: null };
    }

    return { running: existing.status === "running", url: existing.previewUrl };
  }

  /**
   * Get existing sandbox or create a new one for a project.
   */
  async getOrCreate(projectId: string): Promise<ManagedSandbox> {
    const existing = this.sandboxes.get(projectId);

    // Check if existing sandbox is still alive and not expired
    if (existing) {
      const age = Date.now() - existing.createdAt;
      if (age < SANDBOX_TIMEOUT_MS) {
        const alive = await this.isAlive(existing);
        if (alive) return existing;
        // Sandbox died — clean up and recreate
        this.sandboxes.delete(projectId);
      } else {
        // Expired — kill and recreate
        await this.kill(projectId);
      }
    }

    // Create new sandbox
    const apiKey = this.getApiKey();
    const sandbox = await Sandbox.create({
      apiKey,
      timeoutMs: SANDBOX_TIMEOUT_MS,
    });

    const managed: ManagedSandbox = {
      sandbox,
      status: "ready",
      previewUrl: null,
      createdAt: Date.now(),
      lastAliveCheck: Date.now(),
      packageJsonHash: null,
    };

    this.sandboxes.set(projectId, managed);
    return managed;
  }

  /**
   * Write files to sandbox filesystem.
   */
  async writeFiles(
    projectId: string,
    files: Record<string, string>
  ): Promise<void> {
    const managed = await this.getOrCreate(projectId);
    const { sandbox } = managed;

    // Collect all unique directories first, then create them in one batch
    const dirs = new Set<string>();
    for (const path of Object.keys(files)) {
      const dir = path.split("/").slice(0, -1).join("/");
      if (dir) dirs.add(dir);
    }
    if (dirs.size > 0) {
      const mkdirCmd = Array.from(dirs).map(d => `/home/user/${d}`).join(" ");
      await sandbox.commands.run(`mkdir -p ${mkdirCmd}`, { timeoutMs: 10000 });
    }

    // Write files in parallel (batches of 10)
    const entries = Object.entries(files);
    for (let i = 0; i < entries.length; i += 10) {
      const batch = entries.slice(i, i + 10);
      await Promise.all(
        batch.map(([path, content]) =>
          sandbox.files.write(`/home/user/${path}`, content)
        )
      );
    }
  }

  /**
   * Execute a command in the sandbox.
   */
  async exec(
    projectId: string,
    cmd: string,
    onOutput?: (line: string) => void,
    timeoutMs: number = 120000
  ): Promise<{ exitCode: number; output: string }> {
    const managed = await this.getOrCreate(projectId);
    const { sandbox } = managed;

    let output = "";

    const result = await sandbox.commands.run(cmd, {
      timeoutMs,
      cwd: "/home/user",
      onStdout: (data) => {
        output += data;
        onOutput?.(data);
      },
      onStderr: (data) => {
        output += data;
        onOutput?.(data);
      },
    });

    return {
      exitCode: result.exitCode,
      output,
    };
  }

  /**
   * Detect the actual project root (where package.json with "dev" script lives).
   * GitHub repos often have the app in a subdirectory.
   */
  private async detectProjectRoot(
    projectId: string,
    onOutput?: (line: string) => void
  ): Promise<string> {
    const managed = await this.getOrCreate(projectId);
    const { sandbox } = managed;

    // Find all package.json files (excluding node_modules)
    const result = await sandbox.commands.run(
      "find /home/user -name 'package.json' -not -path '*/node_modules/*' -maxdepth 3 2>/dev/null",
      { timeoutMs: 5000 }
    );

    const packageJsonPaths = result.stdout
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    // Check each for a "dev" script
    for (const pkgPath of packageJsonPaths) {
      try {
        const content = await sandbox.files.read(pkgPath);
        if (typeof content === "string") {
          const pkg = JSON.parse(content);
          if (pkg.scripts?.dev) {
            const dir = pkgPath.replace(/\/package\.json$/, "");
            if (dir !== "/home/user") {
              onOutput?.(`Projekt-Root erkannt: ${dir.replace("/home/user/", "")}/`);
            }
            return dir;
          }
        }
      } catch {
        // Skip invalid package.json
      }
    }

    // Fallback: /home/user
    return "/home/user";
  }

  /**
   * Run npm install in the sandbox.
   */
  async install(
    projectId: string,
    onOutput?: (line: string) => void
  ): Promise<{ exitCode: number; output: string }> {
    const managed = await this.getOrCreate(projectId);
    managed.status = "installing";

    const projectRoot = await this.detectProjectRoot(projectId, onOutput);

    const result = await this.exec(
      projectId,
      `cd ${projectRoot} && npm install`,
      onOutput,
      180000 // 3 min timeout for install
    );

    if (result.exitCode !== 0) {
      managed.status = "error";
      throw new Error(`npm install fehlgeschlagen (Exit ${result.exitCode})`);
    }

    managed.status = "ready";
    return result;
  }

  /**
   * Hot-update: write files to an already-running sandbox.
   * Only reinstalls if package.json content changed.
   * Returns existing preview URL without full reboot.
   */
  async hotUpdate(
    projectId: string,
    files: Record<string, string>,
    onOutput?: (line: string) => void
  ): Promise<{ url: string; reinstalled: boolean }> {
    const managed = this.sandboxes.get(projectId);
    if (!managed || managed.status !== "running" || !managed.previewUrl) {
      throw new Error("NO_RUNNING_SANDBOX");
    }

    // Write all files
    await this.writeFiles(projectId, files);
    onOutput?.("Dateien aktualisiert.");

    // Check if package.json changed
    let reinstalled = false;
    const newPkgJson = files["package.json"];
    if (newPkgJson) {
      const newHash = simpleHash(newPkgJson);
      if (managed.packageJsonHash && newHash !== managed.packageJsonHash) {
        onOutput?.("package.json geändert — installiere Pakete neu...");
        managed.status = "installing";
        await this.install(projectId, onOutput);
        managed.packageJsonHash = newHash;
        reinstalled = true;

        // Restart dev server after reinstall
        onOutput?.("Dev Server wird neu gestartet...");
        // Kill existing dev server
        await managed.sandbox.commands.run(
          `pkill -f 'next dev' 2>/dev/null; pkill -f 'npm run dev' 2>/dev/null; sleep 1`,
          { timeoutMs: 10000 }
        ).catch(() => {});

        const { url } = await this.startDevServer(projectId, onOutput);
        managed.previewUrl = url;
        managed.status = "running";
        return { url, reinstalled: true };
      }
      managed.packageJsonHash = newHash;
    }

    // Next.js hot reload will pick up the file changes automatically
    return { url: managed.previewUrl, reinstalled };
  }

  /**
   * Start dev server and return the preview URL.
   */
  async startDevServer(
    projectId: string,
    onOutput?: (line: string) => void
  ): Promise<{ url: string }> {
    const managed = await this.getOrCreate(projectId);
    const { sandbox } = managed;
    managed.status = "starting";

    const projectRoot = await this.detectProjectRoot(projectId, onOutput);

    // Kill any existing dev server first to avoid port conflicts
    await sandbox.commands.run(
      `pkill -f 'next dev' 2>/dev/null; pkill -f 'npm run dev' 2>/dev/null; sleep 1`,
      { timeoutMs: 10000 }
    ).catch(() => {});

    // Start dev server in background
    const process = await sandbox.commands.run(
      `cd ${projectRoot} && npm run dev`,
      {
        timeoutMs: 60000,
        background: true,
        onStdout: (data) => onOutput?.(data),
        onStderr: (data) => onOutput?.(data),
      }
    );

    // Wait for server to be ready (poll for port 3000 or 5173)
    const maxWait = 60000;
    const start = Date.now();
    let previewUrl = "";
    const ports = [3000, 5173, 4321, 8080];

    while (Date.now() - start < maxWait) {
      await new Promise((r) => setTimeout(r, 2000));
      for (const port of ports) {
        try {
          // Method 1: Check if port is listening via ss (most reliable in E2B)
          const ssCheck = await sandbox.commands.run(
            `ss -tln 2>/dev/null | grep -q ':${port} ' && echo 'LISTENING' || echo 'NO'`,
            { timeoutMs: 3000 }
          );
          if (ssCheck.stdout?.trim() === "LISTENING") {
            const host = sandbox.getHost(port);
            previewUrl = `https://${host}`;
            onOutput?.(`Port ${port} erkannt — Server läuft.`);
            break;
          }

          // Method 2: Fallback — curl with 127.0.0.1 (not localhost)
          const check = await sandbox.commands.run(
            `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${port} 2>/dev/null || echo 'not_ready'`,
            { timeoutMs: 5000 }
          );
          const code = check.stdout?.trim();
          if (code && !code.includes("not_ready") && code !== "000") {
            const host = sandbox.getHost(port);
            previewUrl = `https://${host}`;
            break;
          }
        } catch {
          // Port not ready yet
        }
      }
      if (previewUrl) break;
    }

    if (!previewUrl) {
      managed.status = "error";
      throw new Error("Dev Server Timeout — kein Port erreichbar nach 60s");
    }

    // Wait for E2B proxy to propagate the external URL
    // Internal port is open but external proxy URL needs a moment
    onOutput?.("Warte auf Preview-URL...");
    await new Promise((r) => setTimeout(r, 3000));

    managed.status = "running";
    managed.previewUrl = previewUrl;

    // Store initial package.json hash
    try {
      const pkgContent = await sandbox.files.read(`${projectRoot}/package.json`);
      if (typeof pkgContent === "string") {
        managed.packageJsonHash = simpleHash(pkgContent);
      }
    } catch { /* no package.json */ }

    return { url: previewUrl };
  }

  /**
   * Read all project files from sandbox.
   */
  async readFiles(projectId: string): Promise<Record<string, string>> {
    const managed = await this.getOrCreate(projectId);
    const { sandbox } = managed;

    // Get list of all files (excluding node_modules, .next, etc.)
    const result = await sandbox.commands.run(
      "cd /home/user && find . -type f " +
      "-not -path '*/node_modules/*' " +
      "-not -path '*/.next/*' " +
      "-not -path '*/.git/*' " +
      "-not -name 'package-lock.json' " +
      "| head -200",
      { timeoutMs: 10000 }
    );

    const filePaths = result.stdout
      .split("\n")
      .map((p) => p.trim().replace(/^\.\//, ""))
      .filter(Boolean);

    const files: Record<string, string> = {};

    for (const path of filePaths) {
      try {
        const content = await sandbox.files.read(`/home/user/${path}`);
        if (typeof content === "string") {
          files[path] = content;
        }
      } catch {
        // Skip binary files or read errors
      }
    }

    return files;
  }

  /**
   * Get status of a sandbox.
   */
  getStatus(projectId: string): SandboxStatus {
    return this.sandboxes.get(projectId)?.status ?? "idle";
  }

  /**
   * Get preview URL of a sandbox.
   */
  getPreviewUrl(projectId: string): string | null {
    return this.sandboxes.get(projectId)?.previewUrl ?? null;
  }

  /**
   * Kill a sandbox.
   */
  async kill(projectId: string): Promise<void> {
    const managed = this.sandboxes.get(projectId);
    if (!managed) return;

    try {
      await managed.sandbox.kill();
    } catch {
      // Sandbox might already be dead
    }

    this.sandboxes.delete(projectId);
  }

  /**
   * Kill all sandboxes (cleanup on shutdown).
   */
  async killAll(): Promise<void> {
    const ids = Array.from(this.sandboxes.keys());
    await Promise.allSettled(ids.map((id) => this.kill(id)));
  }
}

export const sandboxManager = new E2BSandboxManager();
