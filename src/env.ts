/**
 * Type-safe environment variable validation.
 * Validated once at module load — fails fast with a clear error if required vars are missing.
 *
 * Import this instead of `process.env` in server-side code.
 */
import { z } from "zod";

const envSchema = z.object({
  // ─── Required ─────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),

  // ─── Supabase (optional auth + server-side DB access) ─────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  // Server-only key (bypasses RLS) — used by files, vibe-projects, undo-history, setup-cms
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // ─── E2B Sandbox ──────────────────────────────────────────
  E2B_API_KEY: z.string().min(1).optional(),

  // ─── Vercel Deploy ────────────────────────────────────────
  VERCEL_TOKEN: z.string().min(1).optional(),
  VERCEL_TEAM_ID: z.string().min(1).optional(),

  // ─── Model override ───────────────────────────────────────
  ANTHROPIC_MODEL: z.string().optional().default("claude-sonnet-4-6"),

  // ─── Node env ─────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `\n❌ Ungültige Umgebungsvariablen:\n${issues}\n\nSiehe .env.example für alle benötigten Variablen.`
    );
  }

  return result.data;
}

// Validate once at module load — no runtime overhead on subsequent imports
export const env = validateEnv();
