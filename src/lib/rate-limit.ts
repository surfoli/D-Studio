/**
 * In-memory rate limiter for API routes.
 *
 * ⚠️  Limitation: State resets on server restart and does NOT persist across
 * multiple serverless instances (Vercel, etc.). Each cold-start gets a fresh store.
 * For production multi-instance deployments, replace with Upstash Redis:
 * https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 *
 * Usage:
 *   const limited = checkRateLimit(req, { limit: 20, windowMs: 60_000 });
 *   if (limited) return limited; // already a 429 NextResponse, return immediately
 */

import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60s to prevent unbounded memory growth.
// Note: in serverless environments this interval may never fire — that is fine,
// entries are also lazily evicted in rateLimit() when the window expires.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitOptions {
  /** Maximum requests per window. Default: 20 */
  limit?: number;
  /** Time window in milliseconds. Default: 60s */
  windowMs?: number;
}

/**
 * Check if an identifier (IP, user ID) is within the rate limit.
 * Returns `true` if the request is allowed, `false` if it should be blocked.
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): boolean {
  const { limit = 20, windowMs = 60_000 } = options;
  const now = Date.now();

  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

/**
 * Convenience wrapper: checks the rate limit and returns a ready-to-return
 * 429 NextResponse if blocked, or `null` if the request is allowed.
 *
 * Usage in an API route:
 *   const limited = checkRateLimit(req, { limit: 30 });
 *   if (limited) return limited;
 */
export function checkRateLimit(
  req: Request,
  options: RateLimitOptions = {}
): NextResponse | null {
  const ip = getClientIp(req);
  if (rateLimit(ip, options)) return null;

  return NextResponse.json(
    { error: "Zu viele Anfragen. Bitte warte kurz." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

/**
 * Get remaining requests for an identifier.
 */
export function getRateLimitInfo(
  identifier: string,
  limit = 20
): { remaining: number; resetAt: number } {
  const entry = store.get(identifier);
  if (!entry || Date.now() > entry.resetAt) {
    return { remaining: limit, resetAt: Date.now() };
  }
  return {
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Extract the client IP from a Next.js request.
 * Falls back to "unknown" if headers are not available.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
