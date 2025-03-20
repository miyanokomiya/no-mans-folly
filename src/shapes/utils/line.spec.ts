import { describe, test, expect } from "vitest";
import {
  getClosestOutlineInfoOfLine,
  getIntersectionsBetweenLineShapeAndLine,
  getLineEdgeInfo,
  getNakedLineShape,
  isConnectedToCenter,
  patchByFliplineH,
  patchByFliplineV,
  getShapePatchInfoBySplitingLineAt,
  getSegmentIndexCloseAt,
} from "./line";
import { createShape, getCommonStruct } from "..";
import { LineShape } from "../line";
import { createLineHead } from "../lineHeads";
import { struct as lineStruct } from "../line";

describe("getNakedLineShape", () => {
  test("should return the line with minimum styles", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      pHead: createLineHead("dot"),
      qHead: createLineHead("dot"),
    });
    const result = getNakedLineShape(line);
    expect(result.stroke.width).toBe(0);
    expect(result.pHead).toBe(undefined);
    expect(result.qHead).toBe(undefined);
  });
});

describe("patchByFliplineH", () => {
  test("should flip a line horizontally", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }],
      curves: [{ c1: { x: 10, y: -10 }, c2: { x: 60, y: -10 } }, { d: { x: 0, y: 10 } }],
      q: { x: 100, y: 100 },
    });
    const result = patchByFliplineH(line);
    expect(result.p).toEqual({ x: 100, y: 0 });
    expect(result.body).toEqual([{ p: { x: 0, y: 0 } }]);
    expect(result.curves).toEqual([{ c1: { x: 90, y: -10 }, c2: { x: 40, y: -10 } }, { d: { x: 0, y: -10 } }]);
    expect(result.q).toEqual({ x: 0, y: 100 });
  });

  test("should remove connections when a vertex moves", () => {
    const c = { id: "a", rate: { x: 0.1, y: 0.2 } };
    const line0 = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      pConnection: c,
      body: [{ p: { x: 50, y: 0 }, c }],
      q: { x: 100, y: 100 },
      qConnection: c,
    });
    const result0 = patchByFliplineH(line0);
    expect(result0).toHaveProperty("pConnection");
    expect(result0.pConnection).toBe(undefined);
    expect(result0).toHaveProperty("qConnection");
    expect(result0.qConnection).toBe(undefined);
    expect(result0.body).toEqual([{ p: { x: 50, y: 0 }, c }]);

    const line1 = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      pConnection: c,
      q: { x: 0, y: 100 },
      qConnection: c,
    });
    const result1 = patchByFliplineH(line1);
    expect(result1).not.toHaveProperty("pConnection");
    expect(result1).not.toHaveProperty("qConnection");
  });

  test("should swap pConnection and qConnection when p and q are swapped their positions", () => {
    const c0 = { id: "a", rate: { x: 0.1, y: 0.2 } };
    const c1 = { id: "b", rate: { x: 0.1, y: 0.2 } };
    const line0 = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      pConnection: c0,
      q: { x: 100, y: 0 },
      qConnection: c1,
    });
    const result0 = patchByFliplineH(line0);
    expect(result0.pConnection).toEqual(c1);
    expect(result0.qConnection).toEqual(c0);
  });
});

describe("patchByFliplineV", () => {
  test("should flip a line horizontally", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }],
      curves: [{ c1: { x: 10, y: -10 }, c2: { x: 60, y: -10 } }, { d: { x: 0, y: 10 } }],
      q: { x: 100, y: 100 },
    });
    const result = patchByFliplineV(line);
    expect(result.p).toEqual({ x: 0, y: 100 });
    expect(result.body).toEqual([{ p: { x: 100, y: 100 } }]);
    expect(result.curves).toEqual([{ c1: { x: 10, y: 110 }, c2: { x: 60, y: 110 } }, { d: { x: 0, y: -10 } }]);
    expect(result.q).toEqual({ x: 100, y: 0 });
  });
});

describe("getClosestOutlineInfoOfLine", () => {
  test("should return the closest outline info if exists", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 } });
    expect(getClosestOutlineInfoOfLine(line0, { x: 40, y: 11 }, 10)).toEqual(undefined);
    expect(getClosestOutlineInfoOfLine(line0, { x: 40, y: 9 }, 10)).toEqual([{ x: 40, y: 0 }, 0.4]);
  });

  test("should regard bezier segment", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 }, curves: [{ c1: { x: 20, y: 20 }, c2: { x: 80, y: 20 } }] });
    const result0 = getClosestOutlineInfoOfLine(line0, { x: 40, y: 9 }, 10);
    expect(result0?.[0]).toEqualPoint({ x: 39.60592371, y: 14.54526294 });
    expect(result0?.[1]).toBeCloseTo(0.4);
  });

  test("should regard arc segment", () => {
    const line0 = lineStruct.create({ q: { x: 100, y: 0 }, curves: [{ d: { x: 0, y: 20 } }] });
    const result0 = getClosestOutlineInfoOfLine(line0, { x: 40, y: 18 }, 10);
    expect(result0?.[0]).toEqualPoint({ x: 39.816488, y: 19.2812392 });
    expect(result0?.[1]).toBeCloseTo(0.4081723);
  });
});

describe("getLineEdgeInfo", () => {
  test("should return lerp function based on distance", () => {
    const line0 = lineStruct.create({
      q: { x: 200, y: 0 },
      curves: [{ c1: { x: 50, y: 150 }, c2: { x: 150, y: 150 } }],
    });
    const target = getLineEdgeInfo(line0);
    expect(target.lerpFn(80 / target.totalLength)).toEqualPoint({ x: 34.99598644197986, y: 71.72119092860004 });
  });
});

describe("isConnectedToCenter", () => {
  test("should return true when the connection is at the center", () => {
    expect(isConnectedToCenter({ id: "a", rate: { x: 0.5, y: 0.5 } })).toBe(true);
    expect(isConnectedToCenter({ id: "a", rate: { x: 0.49, y: 0.5 } })).toBe(false);
    expect(isConnectedToCenter({ id: "a", rate: { x: 0.5, y: 0.51 } })).toBe(false);
  });
});

describe("getSegmentIndexCloseAt", () => {
  test("should return the index of the closest segment", () => {
    const line0 = lineStruct.create({
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }],
      q: { x: 100, y: 100 },
    });
    expect(getSegmentIndexCloseAt(line0, { x: -10, y: 1 }, 2)).toBe(-1);
    expect(getSegmentIndexCloseAt(line0, { x: 10, y: 1 }, 2)).toBe(0);
    expect(getSegmentIndexCloseAt(line0, { x: 101, y: 10 }, 2)).toBe(1);
    expect(getSegmentIndexCloseAt(line0, { x: 101, y: 110 }, 2)).toBe(-1);
    expect(getSegmentIndexCloseAt(line0, { x: 50, y: 50 }, 2)).toBe(-1);
  });
});

describe("getIntersectionsBetweenLineShapeAndLine", () => {
  test("should return intersections between line shape and a line", () => {
    const shape = lineStruct.create({
      p: { x: 0, y: 0 },
      q: { x: 100, y: 0 },
      curves: [{ c1: { x: 0, y: 50 }, c2: { x: 100, y: 50 } }],
    });
    const res2 = getIntersectionsBetweenLineShapeAndLine(shape, [
      { x: 50, y: -20 },
      { x: 50, y: 20 },
    ]);
    expect(res2, "bezier").toEqualPoints([{ x: 50, y: 37.5 }]);
  });
});

describe("getShapePatchInfoBySplitingLineAt", () => {
  test("should return new line source and current line patch when splitting at a point: straight segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      curves: [undefined, { d: { x: 0.5, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplitingLineAt(line, 0, { x: 20, y: 0 }, 1)!;
    expect(newLineSrc.p).toEqualPoint({ x: 20, y: 0 });
    expect(newLineSrc.body).toHaveLength(1);
    expect(newLineSrc.body?.[0].p).toEqualPoint({ x: 50, y: 0 });
    expect(newLineSrc.curves).toEqual([undefined, { d: { x: 0.5, y: 25 } }]);
    expect(newLineSrc.q).toEqualPoint({ x: 100, y: 0 });
    expect(currentLinePatch.q).toEqualPoint({ x: 20, y: 0 });
    expect(currentLinePatch).toHaveProperty("body");
    expect(currentLinePatch.body).toBe(undefined);
    expect(currentLinePatch).toHaveProperty("curves");
    expect(currentLinePatch.curves).toBe(undefined);
  });

  test("should return new line source and current line patch when splitting at a point: curve segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      curves: [undefined, { d: { x: 0.5, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplitingLineAt(line, 1, { x: 75, y: 25 }, 1)!;
    expect(newLineSrc.p).toEqualPoint({ x: 75, y: 25 });
    expect(newLineSrc.body).toBe(undefined);
    expect(newLineSrc.curves).toEqual([{ d: { x: 0.5, y: expect.anything() } }]);
    expect((newLineSrc.curves as any)?.[0].d.y).toBeCloseTo(7.32233);
    expect(newLineSrc.q).toEqualPoint({ x: 100, y: 0 });
    expect(currentLinePatch.q).toEqualPoint({ x: 75, y: 25 });
    expect(currentLinePatch.body?.[0].p).toEqualPoint({ x: 50, y: 0 });
    expect(currentLinePatch.curves).toEqual([undefined, { d: { x: 0.5, y: expect.anything() } }]);
    expect((currentLinePatch.curves as any)?.[1].d.y).toBeCloseTo(7.32233);
  });

  test("should return undefined if no closest point is found", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      curves: [{ c1: { x: 25, y: 25 }, c2: { x: 75, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    const result = getShapePatchInfoBySplitingLineAt(line, 0, { x: 200, y: 200 }, 1);
    expect(result).toBeUndefined();
  });

  test("should preserve current connections", () => {
    const ca = { id: "a", rate: { x: 0.5, y: 0.5 } };
    const cb = { id: "b", rate: { x: 0.5, y: 0.5 } };
    const cc = { id: "c", rate: { x: 0.5, y: 0.5 } };
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      q: { x: 50, y: 50 },
      pConnection: ca,
      body: [{ p: { x: 50, y: 0 }, c: cb }],
      qConnection: cc,
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplitingLineAt(line, 0, { x: 20, y: 0 }, 1)!;
    expect(currentLinePatch).not.toHaveProperty("pConnection");
    expect(currentLinePatch.body).toEqual(undefined);
    expect(currentLinePatch).toHaveProperty("qConnection");
    expect(currentLinePatch.qConnection).toEqual(undefined);
    expect(newLineSrc).toHaveProperty("pConnection");
    expect(newLineSrc.pConnection).toEqual(undefined);
    expect(newLineSrc.body?.[0].c).toEqual(cb);
    expect(newLineSrc.qConnection).toEqual(cc);
  });

  test("should handle split at the vertex", () => {
    const cb = { id: "b", rate: { x: 0.5, y: 0.5 } };
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 25, y: 0 } }, { p: { x: 50, y: 0 }, c: cb }, { p: { x: 50, y: 50 } }],
      q: { x: 100, y: 50 },
      curves: [undefined, undefined, { d: { x: 0.5, y: 25 } }],
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplitingLineAt(line, 1, { x: 50, y: 0 }, 1)!;
    expect(currentLinePatch.body).toEqual([{ p: { x: 25, y: 0 } }]);
    expect(currentLinePatch).toHaveProperty("curves");
    expect(currentLinePatch.curves).toEqual(undefined);
    expect(currentLinePatch.q).toEqualPoint({ x: 50, y: 0 });
    expect(currentLinePatch.qConnection).toEqual(cb);
    expect(newLineSrc.p).toEqualPoint({ x: 50, y: 0 });
    expect(newLineSrc.body).toEqual([{ p: { x: 50, y: 50 } }]);
    expect(newLineSrc.curves).toEqual([{ d: { x: 0.5, y: 25 } }]);
    expect(newLineSrc.pConnection).toEqual(cb);

    expect(getShapePatchInfoBySplitingLineAt(line, 1, { x: 50, y: 0 }, 1)).toEqual(
      getShapePatchInfoBySplitingLineAt(line, 2, { x: 50, y: 0 }, 1),
    );
  });

  test("should handle split at the first or last vertex", () => {
    const cb = { id: "b", rate: { x: 0.5, y: 0.5 } };
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      q: { x: 50, y: 50 },
      body: [{ p: { x: 50, y: 0 }, c: cb }],
    });
    expect(getShapePatchInfoBySplitingLineAt(line, 0, { x: 0, y: 0 }, 1)).toBeUndefined();
    expect(getShapePatchInfoBySplitingLineAt(line, 1, { x: 50, y: 50 }, 1)).toBeUndefined();
  });
});
