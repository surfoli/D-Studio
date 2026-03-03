import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkRateLimit,
  rateLimit,
  getRateLimitInfo,
  _clearStoreForTesting,
} from "@/lib/rate-limit";

// Reset module state between tests by mocking time
describe("rateLimit", () => {
  beforeEach(() => {
    _clearStoreForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within limit", () => {
    const ip = `test-ip-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(ip, { limit: 5, windowMs: 60_000 })).toBe(true);
    }
  });

  it("blocks requests exceeding limit", () => {
    const ip = `test-ip-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      rateLimit(ip, { limit: 5, windowMs: 60_000 });
    }
    expect(rateLimit(ip, { limit: 5, windowMs: 60_000 })).toBe(false);
  });

  it("resets after window expires", () => {
    const ip = `test-ip-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      rateLimit(ip, { limit: 5, windowMs: 60_000 });
    }
    // Should be blocked
    expect(rateLimit(ip, { limit: 5, windowMs: 60_000 })).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    // Should be allowed again
    expect(rateLimit(ip, { limit: 5, windowMs: 60_000 })).toBe(true);
  });

  it("tracks different IPs independently", () => {
    const ip1 = `test-ip-a-${Math.random()}`;
    const ip2 = `test-ip-b-${Math.random()}`;

    for (let i = 0; i < 3; i++) {
      rateLimit(ip1, { limit: 3, windowMs: 60_000 });
    }
    // ip1 is blocked
    expect(rateLimit(ip1, { limit: 3, windowMs: 60_000 })).toBe(false);
    // ip2 should still be allowed
    expect(rateLimit(ip2, { limit: 3, windowMs: 60_000 })).toBe(true);
  });
});

describe("getRateLimitInfo", () => {
  beforeEach(() => {
    _clearStoreForTesting();
  });

  it("returns full remaining and resetAt 0 for new IP", () => {
    const ip = `info-ip-${Math.random()}`;
    const info = getRateLimitInfo(ip, 20);
    expect(info.remaining).toBe(20);
    // resetAt: 0 means no active window — avoids returning a past timestamp
    expect(info.resetAt).toBe(0);
  });

  it("returns decreased remaining after requests", () => {
    const ip = `info-ip-${Math.random()}`;
    rateLimit(ip, { limit: 20, windowMs: 60_000 });
    rateLimit(ip, { limit: 20, windowMs: 60_000 });
    const info = getRateLimitInfo(ip, 20);
    expect(info.remaining).toBe(18);
    // resetAt should be in the future
    expect(info.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    _clearStoreForTesting();
  });

  it("applies limits per route (same IP, different path)", () => {
    const headers = { "x-forwarded-for": "203.0.113.10" };
    const routeA = new Request("https://d3.local/api/files", { headers });
    const routeB = new Request("https://d3.local/api/vibe-code", { headers });

    expect(checkRateLimit(routeA, { limit: 1, windowMs: 60_000 })).toBeNull();
    expect(checkRateLimit(routeA, { limit: 1, windowMs: 60_000 })).not.toBeNull();
    // Different route should still be allowed
    expect(checkRateLimit(routeB, { limit: 1, windowMs: 60_000 })).toBeNull();
  });
});
