import { describe, test, expect } from "vitest";
import { applyCornerRadius, getDefaultCurveBody, restoreBodyFromRoundedElbow } from "./curveLine";
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

  test("should preserve d attribute", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      q: { x: 100, y: 0 },
    });

    const res0 = applyCornerRadius({
      ...line,
      body: [
        { p: { x: 50, y: 50 }, elbow: { d: 1, p: { x: 1, y: 2 } } },
        { p: { x: 50, y: 100 }, elbow: { d: 2, p: { x: 1, y: 2 } } },
      ],
    });
    expect(res0.body).toHaveLength(4);
    expect(res0.body?.[0].elbow).toBe(undefined);
    expect(res0.body?.[1].elbow).toEqual({ d: 1, p: { x: 1, y: 2 } });
    expect(res0.body?.[2].elbow).toBe(undefined);
    expect(res0.body?.[3].elbow).toEqual({ d: 2, p: { x: 1, y: 2 } });
  });
});

describe("restoreBodyFromRoundedElbow", () => {
  test("should return source body attribute list", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [
        { p: { x: 50, y: 50 }, elbow: { d: 1, p: { x: 1, y: 2 } } },
        { p: { x: 50, y: 100 }, elbow: { d: 2, p: { x: 1, y: 2 } } },
      ],
      q: { x: 100, y: 0 },
    });

    const roundedElbow = { ...line, ...applyCornerRadius(line) };
    const res = restoreBodyFromRoundedElbow(roundedElbow);
    expect(res).toHaveLength(2);
    expect(res[0].elbow?.d).toBe(1);
    expect(res[1].elbow?.d).toBe(2);
  });
});
