/**
 * Next.js Server Instrumentation (runs once on server startup).
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * NOTE: Next.js 16 + Turbopack has a known race condition where .env.local
 * is not yet loaded when this instrumentation hook runs. Env validation
 * is therefore skipped here and happens lazily in each API route via env.ts.
 */

export async function register() {
  // Env validation is handled lazily in API routes.
  // Doing it here causes a Turbopack race condition with .env.local loading.
}
