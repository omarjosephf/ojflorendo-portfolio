import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks within the window", () => {
    const clock = { t: 1000 };
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => clock.t });
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(false); // 4th within window
  });

  it("starts a new window for a request at exactly the reset boundary", () => {
    const clock = { t: 0 };
    const rl = createRateLimiter({ limit: 1, windowMs: 100, now: () => clock.t });
    expect(rl.check("a")).toBe(true); // window [0, 100)
    expect(rl.check("a")).toBe(false); // still within window
    clock.t = 100; // exactly the reset timestamp
    expect(rl.check("a")).toBe(true); // half-open window: 100 starts fresh
  });

  it("resets after the window elapses", () => {
    const clock = { t: 0 };
    const rl = createRateLimiter({ limit: 1, windowMs: 100, now: () => clock.t });
    expect(rl.check("a")).toBe(true);
    expect(rl.check("a")).toBe(false);
    clock.t = 201;
    expect(rl.check("a")).toBe(true);
  });

  it("tracks keys independently", () => {
    const clock = { t: 0 };
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => clock.t });
    expect(rl.check("a")).toBe(true);
    expect(rl.check("b")).toBe(true);
    expect(rl.check("a")).toBe(false);
    expect(rl.check("b")).toBe(false);
    expect(rl.size()).toBe(2);
  });

  it("prunes expired entries so abandoned keys do not accumulate", () => {
    const clock = { t: 0 };
    const rl = createRateLimiter({ limit: 5, windowMs: 100, now: () => clock.t });
    rl.check("a");
    rl.check("b");
    rl.check("c");
    expect(rl.size()).toBe(3);

    clock.t = 500; // all three windows have expired
    rl.check("d"); // triggers a prune of a/b/c
    expect(rl.size()).toBe(1); // only "d" remains
  });

  it("bounds memory with maxEntries by evicting the entry closest to expiry", () => {
    const clock = { t: 0 };
    const rl = createRateLimiter({
      limit: 5,
      windowMs: 100_000, // long window so nothing prunes during the test
      now: () => clock.t,
      maxEntries: 2,
    });
    clock.t = 1;
    rl.check("a"); // reset = 100001
    clock.t = 2;
    rl.check("b"); // reset = 100002
    clock.t = 3;
    rl.check("c"); // at cap (2) -> evicts "a" (closest to expiry), inserts "c"
    expect(rl.size()).toBe(2);
    // "a" was evicted, so it is treated as a fresh key again
    clock.t = 4;
    expect(rl.check("a")).toBe(true);
  });
});
