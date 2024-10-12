import { describe, test, expect } from "vitest";
import { struct as lineStruct } from "../line";
import { LinePolygonShape, struct } from "./linePolygon";
import { patchLinePolygonFromLine } from "../utils/linePolygon";
import { getCommonStruct } from "..";

describe("resize", () => {
  test("should resize the path", () => {
    const line = lineStruct.create({
      p: { x: 100, y: 100 },
      body: [{ p: { x: 100, y: 0 } }],
      curves: [{ c1: { x: 150, y: 100 }, c2: { x: 150, y: 0 } }],
      q: { x: 0, y: 0 },
    });
    const shape = { ...line, ...patchLinePolygonFromLine(getCommonStruct, line) } as LinePolygonShape;
    const result = struct.resize(shape, [2, 0, 0, 1, 10, 0]);
    expect(result.p).toEqualPoint({ x: 10, y: 0 });
    expect(result.width).toBeCloseTo(275);
    expect(result.height).toBe(undefined);
    expect(result.path?.path).toEqualPoints([
      { x: 200, y: 100 },
      { x: 200, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(result.path?.curves?.[0]?.c1).toEqualPoint({ x: 300, y: 100 });
    expect(result.path?.curves?.[0]?.c2).toEqualPoint({ x: 300, y: 0 });
  });

  test("should get rid of source line data when size changes", () => {
    const line = lineStruct.create({
      p: { x: 100, y: 100 },
      body: [{ p: { x: 100, y: 0 } }],
      q: { x: 0, y: 0 },
    });
    const shape = { ...line, ...patchLinePolygonFromLine(getCommonStruct, line) } as LinePolygonShape;
    const result0 = struct.resize(shape, [2, 0, 0, 1, 10, 0]);
    expect(result0).toHaveProperty("srcLine");
    expect(result0.srcLine).toBe(undefined);

    const result1 = struct.resize(shape, [1, 0, 0, 1, 10, 0]);
    expect(result1).not.toHaveProperty("srcLine");
  });
});
