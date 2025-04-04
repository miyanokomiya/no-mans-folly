import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { newDebounce } from "./debounce";

describe("newDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should debounce the operation", () => {
    let count = 0;
    const target = newDebounce((v: number) => {
      count += v;
    }, 10);

    target(1);
    expect(count).toBe(0);
    vi.advanceTimersByTime(12);
    expect(count).toBe(1);

    target(1);
    vi.advanceTimersByTime(5);
    target(10);
    vi.advanceTimersByTime(5);
    target(100);
    expect(count).toBe(1);
    vi.advanceTimersByTime(12);
    expect(count).toBe(101);

    target(100);
    target.flush();
    expect(count).toBe(201);

    target(100);
    target.clear();
    target.flush();
    expect(count).toBe(201);
  });

  test("should delay the operation by calling delay method", () => {
    let count = 0;
    const target = newDebounce((v: number) => {
      count += v;
    }, 10);

    target(1);
    expect(count).toBe(0);
    vi.advanceTimersByTime(6);
    target.delay();
    vi.advanceTimersByTime(6);
    expect(count).toBe(0);
    vi.advanceTimersByTime(10);
    expect(count).toBe(1);
  });
});
