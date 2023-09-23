import { describe, test, expect } from "vitest";
import { newCache } from "./cache";

describe("useCache", () => {
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
