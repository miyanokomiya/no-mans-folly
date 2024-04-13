import { describe, test, expect } from "vitest";
import { applyCornerRadius, getDefaultCurveBody } from "./curveLine";
import { createShape, getCommonStruct } from "../shapes";
import { LineShape } from "../shapes/line";

describe("getDefaultCurveBody", () => {
  test("should return default body for curve line", () => {
    expect(getDefaultCurveBody({ x: 10, y: 10 }, { x: 20, y: 10 })).toEqual([{ p: { x: 15, y: 12 } }]);
    expect(getDefaultCurveBody({ x: 10, y: 10 }, { x: 10, y: 20 })).toEqual([{ p: { x: 8, y: 15 } }]);
  });
});

describe("applyCornerRadius", () => {
  test("should apply corner radius", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      q: { x: 100, y: 0 },
    });
    expect(applyCornerRadius(line), "empty body").toEqual({});

    const res1 = applyCornerRadius({ ...line, body: [{ p: { x: 50, y: 50 } }] });
    expect(res1.body).toHaveLength(2);
    expect(res1.curves).toHaveLength(2);
    expect(res1.curves?.[0]).toBe(undefined);
    expect(res1.curves?.[1]).not.toBe(undefined);
  });
});
