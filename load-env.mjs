/**
 * Loads .env.local into process.env before starting Next.js dev server.
 * Workaround for Next.js 16 + Turbopack not loading .env.local for Route Handlers.
 */
import { readFileSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, ".env.local");

try {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
  console.log("✅ .env.local geladen");
} catch {
  console.log("⚠️ .env.local nicht gefunden");
}

// Start Next.js
const next = spawn(
  process.execPath,
  ["./node_modules/.bin/next", "dev"],
  { stdio: "inherit", env: process.env }
);

next.on("exit", (code) => process.exit(code ?? 0));
