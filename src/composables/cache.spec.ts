import { expect, describe, test, vi, afterEach, beforeEach } from "vitest";
import { newCache, newChronoCache } from "./cache";

describe("newCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

describe("newChronoCache", () => {
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
