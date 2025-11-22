import { expect, describe, test, vi, afterEach, beforeEach } from "vitest";
import { newLeveledThrottle, newThrottle } from "./throttle";

describe("newThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should omit internal calling", () => {
    const fn = vi.fn();
    const t = newThrottle(fn, 10);
    t();
    t();
    t();
    vi.advanceTimersByTime(20);

    expect(fn).toHaveBeenCalledTimes(1);
  });
  test("should recall after waiting the interval", () => {
    const fn = vi.fn();
    const t = newThrottle(fn, 10);
    t();
    expect(fn).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
    t();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  test("should pass the latest args", () => {
    const mock = vi.fn();
    const fn = (val1: number, val2: number) => mock(val1, val2);
    const t = newThrottle(fn, 10);
    t(10, 100);
    vi.advanceTimersByTime(5);
    t(20, 200);
    vi.advanceTimersByTime(6);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(20, 200);
    t(30, 300);
    vi.advanceTimersByTime(10);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenCalledWith(30, 300);
  });

  describe("when leading is true", () => {
    test("should call leading", () => {
      const mock = vi.fn();
      const fn = (val1: number, val2: number) => mock(val1, val2);
      const t = newThrottle(fn, 10, true);
      t(10, 100);
      expect(mock).toHaveBeenNthCalledWith(1, 10, 100);
      vi.advanceTimersByTime(3);
      t(20, 200);
      expect(mock).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(5);
      expect(mock).toHaveBeenCalledTimes(1);
      t(30, 300);
      expect(mock).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(5);

      expect(mock).toHaveBeenCalledTimes(2);
      expect(mock).toHaveBeenNthCalledWith(1, 10, 100);
      expect(mock).toHaveBeenNthCalledWith(2, 30, 300);
    });

    test("should wait for the next execution", () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newThrottle(fn, 10, true);
      t(10);
      expect(mock).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(5);
      t(20);
      expect(mock).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(3);
      expect(mock).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(3);
      expect(mock).toHaveBeenCalledTimes(2);
      expect(mock).toHaveBeenNthCalledWith(2, 20);
    });
  });

  describe("flush", () => {
    test("should flush current throttled item", () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newThrottle(fn, 10);
      t(10);
      t.flush();
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenNthCalledWith(1, 10);
      vi.advanceTimersByTime(15);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe("clear", () => {
    test("should clear current throttled item", () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newThrottle(fn, 10);
      t(10);
      t.clear();
      vi.advanceTimersByTime(15);
      t(20);
      vi.advanceTimersByTime(15);

      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenNthCalledWith(1, 20);
    });
  });
});

describe("newLeveledThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should omit internal calling", () => {
    const fn = vi.fn();
    const t = newLeveledThrottle(fn, [10]);
    t();
    t();
    t();
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  test("should recall after waiting the interval", () => {
    const fn = vi.fn();
    const t = newLeveledThrottle(fn, [10]);
    t();
    expect(fn).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
    t();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  test("should pass the latest args", () => {
    const mock = vi.fn();
    const fn = (val1: number, val2: number) => mock(val1, val2);
    const t = newLeveledThrottle(fn, [10]);
    t(10, 100);
    vi.advanceTimersByTime(5);
    t(20, 200);
    vi.advanceTimersByTime(6);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(20, 200);
    t(30, 300);
    vi.advanceTimersByTime(10);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenCalledWith(30, 300);
  });

  test("should level up inverval each time the throttle is called in time", () => {
    const fn = vi.fn();
    const t = newLeveledThrottle(fn, [10, 20, 30]);
    t();
    expect(fn).toHaveBeenCalledTimes(0);
    expect(t.getLevel()).toBe(0);
    vi.advanceTimersByTime(11);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(t.getLevel()).toBe(1);
    t();
    vi.advanceTimersByTime(11);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(t.getLevel()).toBe(1);
    vi.advanceTimersByTime(11);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(t.getLevel()).toBe(2);
    t();
    vi.advanceTimersByTime(11);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(t.getLevel()).toBe(2);
    vi.advanceTimersByTime(11);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(t.getLevel()).toBe(2);
    vi.advanceTimersByTime(11);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(t.getLevel()).toBe(2);
  });

  test("should level down inverval each time the throttle isn't called in time", () => {
    const fn = vi.fn();
    const t = newLeveledThrottle(fn, [10, 20, 30]);
    t();
    vi.advanceTimersByTime(11);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(t.getLevel()).toBe(1);
    t();
    vi.advanceTimersByTime(22);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(t.getLevel()).toBe(2);
    vi.advanceTimersByTime(22);
    expect(t.getLevel()).toBe(2);
    vi.advanceTimersByTime(11);
    expect(t.getLevel()).toBe(1);
    t();
    vi.advanceTimersByTime(22);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(t.getLevel()).toBe(2);
    vi.advanceTimersByTime(33);
    expect(t.getLevel()).toBe(1);
    vi.advanceTimersByTime(22);
    expect(t.getLevel()).toBe(0);
  });

  describe("flush", () => {
    test("should flush current throttled item", () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newLeveledThrottle(fn, [10]);
      t(10);
      t.flush();
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenNthCalledWith(1, 10);
      vi.advanceTimersByTime(15);
      expect(mock).toHaveBeenCalledTimes(1);
      expect(t.getLevel()).toBe(0);
    });

    test("should return promise object for flushing", async () => {
      const mock = vi.fn();
      const fn = (val1: number) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            mock(val1);
            resolve();
          }, 10);
        });
      };
      const t = newLeveledThrottle(fn, [10]);
      t(10);
      const promise = t.flush();
      expect(mock).toHaveBeenCalledTimes(0);
      promise.then(() => {
        expect(mock).toHaveBeenCalledTimes(1);
      });
      vi.advanceTimersByTime(15);
      expect.assertions(2);
    });
  });

  describe("clear", () => {
    test("should clear current throttled item", () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newLeveledThrottle(fn, [10]);
      t(10);
      t.clear();
      vi.advanceTimersByTime(15);
      t(20);
      vi.advanceTimersByTime(15);

      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenNthCalledWith(1, 20);
      expect(t.getLevel()).toBe(0);
    });
  });
});
