/**
 * In-memory rate limiter for API routes.
 *
 * ⚠️  Limitation: State resets on server restart and does NOT persist across
 * multiple serverless instances (Vercel, etc.). Each cold-start gets a fresh store.
 * For production multi-instance deployments, replace with Upstash Redis:
 * https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 *
 * Usage:
 *   const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
 *   if (limited) return limited; // already a 429 NextResponse, return immediately
 */

import { NextResponse } from "next/server";

/** Named rate limit tiers — use these instead of inline magic numbers. */
export const RATE_LIMITS = {
  /** Full sandbox VM creation — very expensive, strict limit */
  VERY_EXPENSIVE: { limit: 3, windowMs: 60_000 },
  /** AI agent, deploy, setup-cms */
  EXPENSIVE: { limit: 5, windowMs: 60_000 },
  /** GitHub ops, inspect-edit */
  MODERATE: { limit: 20, windowMs: 60_000 },
  /** Code generation, design chat */
  STANDARD_AI: { limit: 30, windowMs: 60_000 },
  /** File ops, project CRUD */
  STANDARD: { limit: 60, windowMs: 60_000 },
  /** Status polling, listing */
  FREQUENT: { limit: 120, windowMs: 60_000 },
} as const;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Cap to prevent unbounded memory growth (≈2–3 MB at max). */
const MAX_STORE_ENTRIES = 50_000;

// Clean up expired entries every 60s.
// Skipped in test environments where fake timers make setInterval unreliable.
if (typeof setInterval !== "undefined" && process.env.NODE_ENV !== "test") {
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
    // Evict oldest entry if store is at capacity before adding new one
    if (!entry && store.size >= MAX_STORE_ENTRIES) {
      const firstKey = store.keys().next().value;
      if (firstKey !== undefined) store.delete(firstKey);
    }
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
 * The Retry-After header reflects the actual windowMs, not a hardcoded value.
 *
 * Usage in an API route:
 *   const limited = checkRateLimit(req, RATE_LIMITS.STANDARD);
 *   if (limited) return limited;
 */
export function checkRateLimit(
  req: Request,
  options: RateLimitOptions = {}
): NextResponse | null {
  const { windowMs = 60_000 } = options;
  const ip = getClientIp(req);
  if (rateLimit(ip, options)) return null;

  const retryAfterSeconds = Math.ceil(windowMs / 1000).toString();
  return NextResponse.json(
    { error: "Zu viele Anfragen. Bitte warte kurz." },
    { status: 429, headers: { "Retry-After": retryAfterSeconds } }
  );
}

/**
 * Get remaining requests and reset time for an identifier.
 * Returns resetAt: 0 when no active window exists (no prior requests).
 */
export function getRateLimitInfo(
  identifier: string,
  limit = 20
): { remaining: number; resetAt: number } {
  const entry = store.get(identifier);
  if (!entry || Date.now() > entry.resetAt) {
    // No active window — full quota available, no meaningful reset time
    return { remaining: limit, resetAt: 0 };
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
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Clear the rate limit store — for use in unit tests only.
 * Ensures tests start with a clean state and don't bleed into each other.
 */
export function _clearStoreForTesting(): void {
  store.clear();
}
