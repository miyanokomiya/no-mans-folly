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
    await sleep(20);
    t();
    await sleep(20);

    expect(fn).toHaveBeenCalledTimes(2);
  });
  test("should pass args", async () => {
    const mock = vi.fn();
    const fn = (val1: number, val2: number) => mock(val1, val2);
    const t = newThrottle(fn, 10);
    t(10, 100);
    await sleep(5);
    t(20, 200);
    await sleep(20);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(20, 200);
  });

  describe("if option.leading is true", () => {
    test("should call leading", async () => {
      const mock = vi.fn();
      const fn = (val1: number, val2: number) => mock(val1, val2);
      const t = newThrottle(fn, 10, true);
      t(10, 100);
      await sleep(20);
      t(20, 200);
      await sleep(5);
      t(30, 300);
      await sleep(20);

      expect(mock).toHaveBeenCalledTimes(2);
      expect(mock).toHaveBeenNthCalledWith(1, 10, 100);
      expect(mock).toHaveBeenNthCalledWith(2, 20, 200);
    });
  });
});
