/**
 * Next.js Server Instrumentation (runs once on server startup).
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This is the ONLY place that needs to import env.ts.
 * If required env vars are missing, the server refuses to start with a clear error.
 */

export async function register() {
  // Only validate on the server side, not in the browser bundle
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./env");
  }
}
