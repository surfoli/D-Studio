/**
 * In-memory rate limiter for API routes.
 * Resets on server restart — for production use Upstash Redis instead.
 *
 * Usage:
 *   const allowed = rateLimit(ip, { limit: 20, windowMs: 60_000 });
 *   if (!allowed) return new Response("Too Many Requests", { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

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
