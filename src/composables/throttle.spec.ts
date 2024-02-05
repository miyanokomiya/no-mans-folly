import { expect, describe, test, vi } from "vitest";
import { newThrottle } from "./throttle";

async function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

describe("newThrottle", () => {
  test("should omit internal calling", async () => {
    const fn = vi.fn();
    const t = newThrottle(fn, 10);
    t();
    t();
    t();
    await sleep(20);

    expect(fn).toHaveBeenCalledTimes(1);
  });
  test("should recall after waiting the interval", async () => {
    const fn = vi.fn();
    const t = newThrottle(fn, 10);
    t();
    expect(fn).toHaveBeenCalledTimes(0);
    await sleep(20);
    expect(fn).toHaveBeenCalledTimes(1);
    t();
    expect(fn).toHaveBeenCalledTimes(1);
    await sleep(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  test("should pass the latest args", async () => {
    const mock = vi.fn();
    const fn = (val1: number, val2: number) => mock(val1, val2);
    const t = newThrottle(fn, 10);
    t(10, 100);
    await sleep(5);
    t(20, 200);
    await sleep(6);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(20, 200);
    t(30, 300);
    await sleep(10);
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock).toHaveBeenCalledWith(30, 300);
  });

  describe("when leading is true", () => {
    test("should call leading", async () => {
      const mock = vi.fn();
      const fn = (val1: number, val2: number) => mock(val1, val2);
      const t = newThrottle(fn, 10, true);
      t(10, 100);
      expect(mock).toHaveBeenNthCalledWith(1, 10, 100);
      await sleep(3);
      t(20, 200);
      expect(mock).toHaveBeenCalledTimes(1);
      await sleep(5);
      expect(mock).toHaveBeenCalledTimes(1);
      t(30, 300);
      expect(mock).toHaveBeenCalledTimes(1);
      await sleep(5);

      expect(mock).toHaveBeenCalledTimes(2);
      expect(mock).toHaveBeenNthCalledWith(1, 10, 100);
      expect(mock).toHaveBeenNthCalledWith(2, 30, 300);
    });

    test("should wait for the next execution", async () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newThrottle(fn, 10, true);
      t(10);
      expect(mock).toHaveBeenCalledTimes(1);
      await sleep(5);
      t(20);
      expect(mock).toHaveBeenCalledTimes(1);
      await sleep(3);
      expect(mock).toHaveBeenCalledTimes(1);
      await sleep(3);
      expect(mock).toHaveBeenCalledTimes(2);
      expect(mock).toHaveBeenNthCalledWith(2, 20);
    });
  });

  describe("flush", () => {
    test("should flush current throttled item", async () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newThrottle(fn, 10);
      t(10);
      t.flush();
      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenNthCalledWith(1, 10);
      await sleep(15);
      expect(mock).toHaveBeenCalledTimes(1);
    });
  });

  describe("clear", () => {
    test("should clear current throttled item", async () => {
      const mock = vi.fn();
      const fn = (val1: number) => mock(val1);
      const t = newThrottle(fn, 10);
      t(10);
      t.clear();
      await sleep(15);
      t(20);
      await sleep(15);

      expect(mock).toHaveBeenCalledTimes(1);
      expect(mock).toHaveBeenNthCalledWith(1, 20);
    });
  });
});
