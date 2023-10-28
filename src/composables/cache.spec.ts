import { describe, test, expect } from "vitest";
import { newCache, newChronoCache } from "./cache";

async function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

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

describe("newChronoCache", () => {
  test("should return cached value if it exists", () => {
    const target = newChronoCache<string, number>({ duration: 10, getTimestamp: () => 0 });
    target.setValue("b", 1);
    expect(target.getValue("a")).toEqual(undefined);
    expect(target.getValue("b")).toEqual(1);
  });

  test("should clear expired cache on get any value", async () => {
    let timestamp = 0;
    const target = newChronoCache<string, number>({ duration: 10, getTimestamp: () => timestamp });
    target.setValue("a", 1);
    target.setValue("b", 2);
    expect(target.getValue("a")).toEqual(1);
    timestamp = 9;
    await sleep(9);
    expect(target.getValue("a")).toEqual(1);
    expect(target.getValue("b")).toEqual(2);
    timestamp = 15;
    await sleep(15);
    expect(target.getValue("b")).toEqual(2);
    timestamp = 20;
    await sleep(20);
    expect(target.getValue("a")).toEqual(undefined);
    expect(target.getValue("b")).toEqual(2);
  });
});
