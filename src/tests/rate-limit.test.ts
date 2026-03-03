import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, getRateLimitInfo } from "@/lib/rate-limit";

// Reset module state between tests by mocking time
describe("rateLimit", () => {
  beforeEach(() => {
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
  it("returns full remaining for new IP", () => {
    const ip = `info-ip-${Math.random()}`;
    const info = getRateLimitInfo(ip, 20);
    expect(info.remaining).toBe(20);
  });

  it("returns decreased remaining after requests", () => {
    const ip = `info-ip-${Math.random()}`;
    rateLimit(ip, { limit: 20, windowMs: 60_000 });
    rateLimit(ip, { limit: 20, windowMs: 60_000 });
    const info = getRateLimitInfo(ip, 20);
    expect(info.remaining).toBe(18);
  });
});
