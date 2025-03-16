import { describe, test, expect } from "vitest";
import {
  canMakePolygon,
  convertLinePathToSimplePath,
  covertArcToBezier,
  patchLineFromLinePolygon,
  patchLinePolygonFromLine,
} from "./linePolygon";
import { createShape, getCommonStruct } from "..";
import { LineShape } from "../line";
import { ISegment } from "../../utils/geometry";
import { getArcLerpFn } from "okageo";
import { LinePolygonShape } from "../polygons/linePolygon";

describe("patchLinePolygonFromLine", () => {
  test("should make a line polygon from the line", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 100, y: 0 },
      body: [{ p: { x: 100, y: 50 }, c: { id: "a", rate: { x: 0.1, y: 0.2 } } }],
      q: { x: 0, y: 50 },
      pConnection: { id: "b", rate: { x: 0.1, y: 0.2 } },
    });
    const result = patchLinePolygonFromLine(getCommonStruct, line);
    expect(result.p).toEqualPoint({ x: 0, y: 0 });
    expect(result.width).toBeCloseTo(100);
    expect(result.height).toBeCloseTo(50);
    expect(result).toHaveProperty("pConnection");
    expect(result.pConnection).toBe(undefined);
    expect(result.srcLine?.vertices, "should delete all connections").toEqual([
      { p: { x: 100, y: 0 } },
      { p: { x: 100, y: 50 } },
      { p: { x: 0, y: 50 } },
    ]);
    expect(result.polygonType).toBe(undefined);

    const result1 = patchLinePolygonFromLine(getCommonStruct, line, 1);
    expect(result1.polygonType).toBe(1);
  });

  test("should convert arc segment to bezier segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }],
      q: { x: 100, y: 100 },
      curves: [{ d: { x: 0, y: 50 } }, { d: { x: 0, y: -50 } }],
    });
    const result = patchLinePolygonFromLine(getCommonStruct, line);
    expect(result.path?.path).toHaveLength(9);
    expect(result.path?.path[2]).toEqualPoint({ x: 50, y: 50 });
    expect(result.path?.path[4]).toEqualPoint({ x: 100, y: 0 });
    expect(result.path?.path[6]).toEqualPoint({ x: 150, y: 50 });
    expect(result.path?.path[8]).toEqualPoint({ x: 100, y: 100 });
    expect(result.path?.curves).toHaveLength(8);
  });
});

describe("patchLineFromLinePolygon", () => {
  const line = createShape<LineShape>(getCommonStruct, "line", {
    p: { x: 100, y: 0 },
    body: [{ p: { x: 100, y: 100 } }],
    q: { x: 0, y: 100 },
  });

  test("should make a line from the line polygon", () => {
    const linePolygon = patchLinePolygonFromLine(getCommonStruct, line);
    const result = patchLineFromLinePolygon(getCommonStruct, { ...line, ...linePolygon } as LinePolygonShape);
    expect(line).toEqual(result);
  });

  test("should regard rotation", () => {
    const linePolygon = patchLinePolygonFromLine(getCommonStruct, line);
    const result = patchLineFromLinePolygon(getCommonStruct, {
      ...line,
      ...linePolygon,
      rotation: Math.PI / 2,
    } as LinePolygonShape);
    expect(result.rotation).toBeCloseTo(0);
    expect(result.p).toEqualPoint({ x: 100, y: 100 });
    expect(result.body?.[0].p).toEqualPoint({ x: 0, y: 100 });
    expect(result.q).toEqualPoint({ x: 0, y: 0 });
  });
});

describe("convertLinePathToSimplePath", () => {
  test("should convert line path to simple path", () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const result = convertLinePathToSimplePath(vertices, [{ d: { x: 0, y: 50 } }]);
    const arcLerpFn = getArcLerpFn(50, 50, vertices[0], vertices[1], false, false, 0);
    expect(result.path).toEqualPoints([
      vertices[0],
      arcLerpFn(1 / 4),
      arcLerpFn(2 / 4),
      arcLerpFn(3 / 4),
      vertices[1],
      vertices[2],
    ]);
    expect(result.curves).toHaveLength(5);
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
    expect(canMakePolygon(line)).toBe(true);
    expect(canMakePolygon({ ...line, lineType: "elbow" })).toBe(false);
    expect(canMakePolygon({ ...line, body: [{ p: { x: 10, y: 10 } }], curves: [] })).toBe(true);
    expect(canMakePolygon({ ...line, body: [{ p: { x: 10, y: 10 } }], curves: [], lineType: "elbow" })).toBe(false);
    expect(canMakePolygon({ ...line, body: [], curves: [{ d: { x: 0, y: 10 } }] })).toBe(true);
  });
});
