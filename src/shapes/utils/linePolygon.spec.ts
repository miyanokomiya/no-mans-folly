import { describe, test, expect } from "vitest";
import { canMakePolygon, covertArcToBezier, patchLineFromLinePolygon, patchLinePolygonFromLine } from "./linePolygon";
import { createShape, getCommonStruct } from "..";
import { LineShape } from "../line";
import { ISegment } from "../../utils/geometry";
import { getArcLerpFn } from "okageo";

describe("patchLinePolygonFromLine", () => {
  test("should make a line polygon from the line", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", { p: { x: 100, y: 0 }, q: { x: 0, y: 50 } });
    const result = patchLinePolygonFromLine(getCommonStruct, line);
    expect(result.p).toEqualPoint({ x: 0, y: 0 });
    expect(result.width).toBeCloseTo(100);
    expect(result.height).toBeCloseTo(50);
  });

  test("should convert arc segment to bezier segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }],
      q: { x: 100, y: 100 },
      curves: [{ d: { x: 0, y: 50 } }, { d: { x: 0, y: -50 } }],
    });
    const result = patchLinePolygonFromLine(getCommonStruct, line);
    expect(result.path.path).toHaveLength(9);
    expect(result.path.path[2]).toEqualPoint({ x: 50, y: 50 });
    expect(result.path.path[4]).toEqualPoint({ x: 100, y: 0 });
    expect(result.path.path[6]).toEqualPoint({ x: 150, y: 50 });
    expect(result.path.path[8]).toEqualPoint({ x: 100, y: 100 });
    expect(result.path.curves).toHaveLength(8);
  });
});

describe("patchLineFromLinePolygon", () => {
  test("should make a line from the line polygon", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", { p: { x: 100, y: 0 }, q: { x: 0, y: 50 } });
    const linePolygon = patchLinePolygonFromLine(getCommonStruct, line);
    const result = patchLineFromLinePolygon(getCommonStruct, linePolygon);
    expect(line).toEqual(result);
  });
});

describe("covertArcToBezier", () => {
  test("should convert arc path to bezier path", () => {
    const seg: ISegment = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const result = covertArcToBezier(seg, { d: { x: 0, y: 50 } });
    const arcLerpFn = getArcLerpFn(50, 50, seg[0], seg[1], false, false, 0);
    expect(result.path).toEqualPoints([seg[0], arcLerpFn(1 / 4), arcLerpFn(2 / 4), arcLerpFn(3 / 4), seg[1]]);
    expect(result.curves).toHaveLength(4);
  });
});

describe("canMakePolygon", () => {
  test("should return true when a line can be converted to a polygon", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {});
    expect(canMakePolygon(line)).toBe(false);
    expect(canMakePolygon({ ...line, lineType: "elbow" })).toBe(false);
    expect(canMakePolygon({ ...line, body: [{ p: { x: 10, y: 10 } }], curves: [] })).toBe(true);
    expect(canMakePolygon({ ...line, body: [{ p: { x: 10, y: 10 } }], curves: [], lineType: "elbow" })).toBe(false);
    expect(canMakePolygon({ ...line, body: [], curves: [{ d: { x: 0, y: 10 } }] })).toBe(true);
  });
});
