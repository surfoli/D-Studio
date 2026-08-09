/**
 * Loads .env.local manually into process.env.
 *
 * Workaround for Next.js 16 + Turbopack bug where .env.local is not
 * available in Route Handler subprocesses at runtime.
 *
 * Call loadEnv() at the top of any API route that needs env vars.
 */
import { readFileSync } from "fs";
import { join } from "path";

export function loadEnv(): void {
  try {
    const envPath = join(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      // Always overwrite — Next.js 16 Turbopack pre-sets env keys to empty string "".
      // We must force-set regardless of what's already there to fix the bug.
      if (key && value) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local not found — silently ignore (production uses real env vars)
  }
}
