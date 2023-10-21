import { describe, test, expect } from "vitest";
import { convertPaddingType, getBoxPaddingValue, getPaddingRect } from "./boxPadding";

describe("getPaddingRect", () => {
  test("should return a rect applied the padding: absolute", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getPaddingRect({ value: [0, 0, 0, 0] }, rect)).toEqual(rect);
    expect(getPaddingRect({ value: [1, 2, 3, 4] }, rect)).toEqual({ x: 4, y: 1, width: 94, height: 96 });

    // should adjust size when a padding is too large
    // => prioritize top and left rather than bottom and right
    expect(getPaddingRect({ value: [200, 200, 200, 200] }, rect)).toEqual({ x: 100, y: 100, width: 0, height: 0 });
    expect(getPaddingRect({ value: [20, 200, 200, 10] }, rect)).toEqual({ x: 10, y: 20, width: 0, height: 0 });
  });

  test("should return a rect applied the padding: relative", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getPaddingRect({ type: "relative", value: [0, 0, 0, 0] }, rect)).toEqual(rect);
    expect(getPaddingRect({ type: "relative", value: [0.1, 0.2, 0.3, 0.4] }, rect)).toEqual({
      x: 40,
      y: 10,
      width: 40,
      height: 60,
    });

    // should adjust size when a padding is too large
    // => prioritize top and left rather than bottom and right
    expect(getPaddingRect({ type: "relative", value: [2, 2, 2, 2] }, rect)).toEqual({
      x: 100,
      y: 100,
      width: 0,
      height: 0,
    });
    expect(getPaddingRect({ type: "relative", value: [0.2, 2, 2, 0.1] }, rect)).toEqual({
      x: 10,
      y: 20,
      width: 0,
      height: 0,
    });
  });

  test("should return the same rect when a padding is undefined", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getPaddingRect(undefined, rect)).toEqual(rect);
  });
});

describe("convertPaddingType", () => {
  test('should conver "absolute" to "relative"', () => {
    const rect = { x: 0, y: 0, width: 100, height: 200 };
    expect(convertPaddingType({ value: [10, 20, 30, 40] }, rect, "relative")).toEqual({
      type: "relative",
      value: [0.05, 0.2, 0.15, 0.4],
    });
  });

  test('should conver "relative" to "absolute"', () => {
    const rect = { x: 0, y: 0, width: 100, height: 200 };
    expect(
      convertPaddingType(
        {
          type: "relative",
          value: [0.05, 0.2, 0.15, 0.4],
        },
        rect,
      ),
    ).toEqual({
      value: [10, 20, 30, 40],
    });
  });
});

describe("getBoxPaddingValue", () => {
  test("should return box padding value", () => {
    expect(getBoxPaddingValue({ value: [1, 2, 5, 7] }, { x: 0, y: 0, width: 100, height: 200 })).toEqual([1, 2, 5, 7]);
    expect(
      getBoxPaddingValue(
        { value: [0.01, 0.02, 0.05, 0.07], type: "relative" },
        { x: 0, y: 0, width: 100, height: 200 },
      ).map((v) => Math.round(v * 1000) / 1000),
    ).toEqual([2, 2, 10, 7]);
  });
});
