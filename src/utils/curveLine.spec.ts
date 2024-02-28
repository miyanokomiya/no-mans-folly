import { describe, test, expect } from "vitest";
import { getDefaultCurveBody } from "./curveLine";

describe("getDefaultCurveBody", () => {
  test("should return default body for curve line", () => {
    expect(getDefaultCurveBody({ x: 10, y: 10 }, { x: 20, y: 10 })).toEqual([{ p: { x: 15, y: 12 } }]);
    expect(getDefaultCurveBody({ x: 10, y: 10 }, { x: 10, y: 20 })).toEqual([{ p: { x: 8, y: 15 } }]);
  });
});
