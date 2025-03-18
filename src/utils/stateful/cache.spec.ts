import { expect, describe, test, vi, afterEach, beforeEach } from "vitest";
import { newCache, newCacheWithArg, newChronoCache, newObjectWeakCache } from "./cache";

describe("newCache", () => {
  test("should return cached value and reset it if update func is called", () => {
    let count = 0;
    const cache = newCache(() => count);
    expect(cache.getValue()).toBe(0);
    count++;
    expect(cache.getValue()).toBe(0);
    cache.update();
    expect(cache.getValue()).toBe(1);
  });
});

describe("newCacheWithArg", () => {
  test("should return cached value derived from the first argument provided after update func is called", () => {
    let count = 0;
    const cache = newCacheWithArg((label: string) => `${label}_${count}`);
    expect(cache.getValue("a")).toBe("a_0");
    expect(cache.getValue("b")).toBe("a_0");
    count++;
    expect(cache.getValue("b")).toBe("a_0");
    cache.update();
    expect(cache.getValue("c")).toBe("c_1");
    expect(cache.getValue("d")).toBe("c_1");
  });
});

describe("newChronoCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should return cached value if it exists", () => {
    const target = newChronoCache<string, number>({ duration: 10, getTimestamp: () => 0 });
    target.setValue("b", 1);
    expect(target.getValue("a")).toEqual(undefined);
    expect(target.getValue("b")).toEqual(1);
  });

  test("should clear expired cache on get any value", () => {
    let timestamp = 0;
    const target = newChronoCache<string, number>({ duration: 10, getTimestamp: () => timestamp });
    target.setValue("a", 1);
    target.setValue("b", 2);
    expect(target.getValue("a")).toEqual(1);
    timestamp = 9;
    vi.advanceTimersByTime(9);
    expect(target.getValue("a")).toEqual(1);
    expect(target.getValue("b")).toEqual(2);
    timestamp = 15;
    vi.advanceTimersByTime(15);
    expect(target.getValue("b")).toEqual(2);
    timestamp = 20;
    vi.advanceTimersByTime(20);
    expect(target.getValue("a")).toEqual(undefined);
    expect(target.getValue("b")).toEqual(2);
  });
});

describe("newObjectWeakCache", () => {
  test("should return cached value when it exists", () => {
    let count = 0;
    const getFn = () => {
      count++;
      return count;
    };
    const cache = newObjectWeakCache<{ x: number }, { x: number }>();
    const a = { x: 0 };
    expect(cache.getValue(a, "x", getFn)).toBe(1);
    expect(cache.getValue(a, "x", getFn)).toBe(1);
    expect(cache.getValue(a, "x", getFn)).toBe(1);
    expect(count).toBe(1);

    const b = { x: 0 };
    expect(cache.getValue(b, "x", getFn)).toBe(2);
    expect(cache.getValue(b, "x", getFn)).toBe(2);
    expect(count).toBe(2);
  });
});
