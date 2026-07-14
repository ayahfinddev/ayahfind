import { describe, it, expect } from "vitest";
import { DAILY_REFLECTIONS, getTodaysReflection } from "./dailyReflection";

describe("getTodaysReflection", () => {
  it("always returns an index within DAILY_REFLECTIONS", () => {
    for (const d of [new Date(2026, 0, 1), new Date(2026, 5, 15), new Date(2026, 11, 31)]) {
      const ref = getTodaysReflection(d);
      expect(DAILY_REFLECTIONS).toContainEqual(ref);
    }
  });

  it("is stable for the same date", () => {
    const date = new Date(2026, 3, 10);
    expect(getTodaysReflection(date)).toEqual(getTodaysReflection(date));
  });

  it("changes across a large enough date range", () => {
    const a = getTodaysReflection(new Date(2026, 0, 1));
    const b = getTodaysReflection(new Date(2026, 6, 1));
    expect(a).not.toEqual(b);
  });
});
