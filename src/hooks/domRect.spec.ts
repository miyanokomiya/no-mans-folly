import { renderHook } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { useWithinArea } from "./domRect";

describe("useWithinArea", () => {
  test("should return undefined until the bounds are provided", () => {
    expect(renderHook(() => useWithinArea(undefined, undefined)).result.current).toBeUndefined();
    expect(renderHook(() => useWithinArea({ x: 1, y: 2, width: 10, height: 20 })).result.current).toBeUndefined();
    expect(
      renderHook(() => useWithinArea(undefined, { x: 1, y: 2, width: 10, height: 20 })).result.current,
    ).toBeUndefined();
  });

  test("should return adjustment vector", () => {
    expect(
      renderHook(() =>
        useWithinArea({ x: 1, y: 2, width: 10, height: 20 }, { x: 100, y: 200, width: 1000, height: 2000 }),
      ).result.current,
    ).toEqual({ x: 99, y: 198 });
    expect(
      renderHook(() =>
        useWithinArea({ x: 101, y: 202, width: 10, height: 20 }, { x: 100, y: 200, width: 1000, height: 2000 }),
      ).result.current,
    ).toEqual({ x: 0, y: 0 });
    expect(
      renderHook(() =>
        useWithinArea({ x: 1101, y: 2202, width: 10, height: 20 }, { x: 100, y: 200, width: 1000, height: 2000 }),
      ).result.current,
    ).toEqual({ x: -11, y: -22 });
  });

  test("should stay clear of the obstacle", () => {
    expect(
      renderHook(() =>
        useWithinArea({ x: 1, y: 2, width: 10, height: 20 }, { x: -100, y: -100, width: 200, height: 200 }, [
          { x: 0, y: 0, width: 20, height: 30 },
          0,
        ]),
      ).result.current,
    ).toEqual({ x: 0, y: -22 });
    expect(
      renderHook(() =>
        useWithinArea({ x: 11, y: 22, width: 10, height: 20 }, { x: -100, y: -100, width: 200, height: 200 }, [
          { x: 0, y: 0, width: 20, height: 30 },
          1,
        ]),
      ).result.current,
    ).toEqual({ x: 9, y: 0 });
  });

  test("should prioritize the are over obstacle", () => {
    expect(
      renderHook(() =>
        useWithinArea({ x: 1, y: 2, width: 10, height: 20 }, { x: 0, y: 0, width: 200, height: 200 }, [
          { x: 0, y: 0, width: 20, height: 30 },
          0,
        ]),
      ).result.current,
    ).toEqual({ x: 0, y: 28 });
    expect(
      renderHook(() =>
        useWithinArea({ x: 1, y: 2, width: 10, height: 20 }, { x: -50, y: -50, width: 200, height: 200 }, [
          { x: 0, y: 0, width: 20, height: 30 },
          0,
        ]),
      ).result.current,
    ).toEqual({ x: 0, y: -22 });

    expect(
      renderHook(() =>
        useWithinArea({ x: 1, y: 2, width: 10, height: 20 }, { x: 0, y: 0, width: 200, height: 200 }, [
          { x: 0, y: 0, width: 20, height: 30 },
          1,
        ]),
      ).result.current,
    ).toEqual({ x: 19, y: 0 });
    expect(
      renderHook(() =>
        useWithinArea({ x: 1, y: 2, width: 10, height: 20 }, { x: -50, y: -50, width: 200, height: 200 }, [
          { x: 0, y: 0, width: 20, height: 30 },
          1,
        ]),
      ).result.current,
    ).toEqual({ x: -11, y: 0 });
  });
});
