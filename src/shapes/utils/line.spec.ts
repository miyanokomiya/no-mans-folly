import { describe, test, expect } from "vitest";
import {
  getClosestOutlineInfoOfLine,
  getIntersectionsBetweenLineShapeAndLine,
  getLineEdgeInfo,
  getNakedLineShape,
  isConnectedToCenter,
  patchByFliplineH,
  patchByFliplineV,
  getShapePatchInfoBySplittingLineAt,
  getSegmentIndexCloseAt,
  getNewRateAfterSplit,
  getShapePatchInfoByInsertingVertexAt,
  getPatchByExtrudeLineSegment,
  getShapePatchInfoByInsertingVertexThrough,
  getShapePatchInfoBySplittingLineThrough,
  getPatchByReverseLine,
  getPatchByCombineLines,
} from "./line";
import { createShape, getCommonStruct } from "..";
import { getConnections, getLinePath, LineShape } from "../line";
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

describe("getShapePatchInfoBySplittingLineAt", () => {
  test("should return rate of the split point and rate of the split point in the target edge", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      q: { x: 100, y: 0 },
    });
    const result0 = getShapePatchInfoBySplittingLineAt(line, 0, { x: 20, y: 0 }, 1)!;
    expect(result0[2]).toBeCloseTo(0.2);
    expect(result0[3]).toBeCloseTo(0.4);
    const result1 = getShapePatchInfoBySplittingLineAt(line, 1, { x: 60, y: 0 }, 1)!;
    expect(result1[2]).toBeCloseTo(0.6);
    expect(result1[3]).toBeCloseTo(0.2);
  });

  test("should return new line source and current line patch when splitting at a point: straight segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      curves: [undefined, { d: { x: 0.5, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplittingLineAt(line, 0, { x: 20, y: 0 }, 1)!;
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
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplittingLineAt(line, 1, { x: 75, y: 25 }, 1)!;
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
    const result = getShapePatchInfoBySplittingLineAt(line, 0, { x: 200, y: 200 }, 1);
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
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplittingLineAt(line, 0, { x: 20, y: 0 }, 1)!;
    expect(currentLinePatch).not.toHaveProperty("pConnection");
    expect(currentLinePatch.body).toEqual(undefined);
    expect(currentLinePatch).toHaveProperty("qConnection");
    expect(currentLinePatch.qConnection).toEqual(undefined);
    expect(newLineSrc).toHaveProperty("pConnection");
    expect(newLineSrc.pConnection).toEqual(undefined);
    expect(newLineSrc.body?.[0].c).toEqual(cb);
    expect(newLineSrc.qConnection).toEqual(cc);
  });

  test("should distribute arrow heads", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      q: { x: 50, y: 50 },
      pHead: createLineHead("open"),
      qHead: createLineHead("dot_blank"),
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplittingLineAt(line, 0, { x: 20, y: 0 }, 1)!;
    expect(currentLinePatch).not.toHaveProperty("pHead");
    expect(currentLinePatch).toHaveProperty("qHead");
    expect(currentLinePatch.qHead).toEqual(undefined);
    expect(newLineSrc).toHaveProperty("pHead");
    expect(newLineSrc.pHead).toEqual(undefined);
    expect(newLineSrc.qHead).toEqual(createLineHead("dot_blank"));

    const [newLineSrc2, currentLinePatch2] = getShapePatchInfoBySplittingLineAt(line, 0, { x: 50, y: 0 }, 1)!;
    expect(currentLinePatch2).not.toHaveProperty("pHead");
    expect(currentLinePatch2).toHaveProperty("qHead");
    expect(currentLinePatch2.qHead).toEqual(undefined);
    expect(newLineSrc2).toHaveProperty("pHead");
    expect(newLineSrc2.pHead).toEqual(undefined);
    expect(newLineSrc.qHead).toEqual(createLineHead("dot_blank"));
  });

  test("should handle split at the vertex", () => {
    const cb = { id: "b", rate: { x: 0.5, y: 0.5 } };
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 25, y: 0 } }, { p: { x: 50, y: 0 }, c: cb }, { p: { x: 50, y: 50 } }],
      q: { x: 100, y: 50 },
      curves: [undefined, undefined, { d: { x: 0.5, y: 25 } }],
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplittingLineAt(line, 1, { x: 50, y: 0 }, 1)!;
    expect(currentLinePatch.body).toEqual([{ p: { x: 25, y: 0 } }]);
    expect(currentLinePatch).toHaveProperty("curves");
    expect(currentLinePatch.curves).toEqual(undefined);
    expect(currentLinePatch.q).toEqualPoint({ x: 50, y: 0 });
    expect(currentLinePatch.qConnection).toEqual(cb);
    expect(newLineSrc.p).toEqualPoint({ x: 50, y: 0 });
    expect(newLineSrc.body).toEqual([{ p: { x: 50, y: 50 } }]);
    expect(newLineSrc.curves).toEqual([{ d: { x: 0.5, y: 25 } }]);
    expect(newLineSrc.pConnection).toEqual(cb);

    expect(getShapePatchInfoBySplittingLineAt(line, 1, { x: 50, y: 0 }, 1)?.slice(0, 2)).toEqual(
      getShapePatchInfoBySplittingLineAt(line, 2, { x: 50, y: 0 }, 1)?.slice(0, 2),
    );
  });

  test("should handle split at the vertex: at the start of arc segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      q: { x: 50, y: 50 },
      curves: [undefined, { d: { x: 0.5, y: 25 } }],
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplittingLineAt(line, 0, { x: 50, y: 0 }, 1)!;
    expect(currentLinePatch).toHaveProperty("body");
    expect(currentLinePatch.body).toEqual(undefined);
    expect(currentLinePatch).toHaveProperty("curves");
    expect(currentLinePatch.curves).toEqual(undefined);
    expect(currentLinePatch.q).toEqualPoint({ x: 50, y: 0 });
    expect(newLineSrc.p).toEqualPoint({ x: 50, y: 0 });
    expect(newLineSrc.body).toEqual(undefined);
    expect(newLineSrc.curves).toEqual([{ d: { x: 0.5, y: 25 } }]);

    expect(getShapePatchInfoBySplittingLineAt(line, 0, { x: 50, y: 0 }, 1)?.slice(0, 2)).toEqual(
      getShapePatchInfoBySplittingLineAt(line, 1, { x: 50, y: 0 }, 1)?.slice(0, 2),
    );
  });

  test("should handle split at the vertex: at the end of arc segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      q: { x: 50, y: 50 },
      curves: [{ d: { x: 0.5, y: 25 } }],
    });
    const [newLineSrc, currentLinePatch] = getShapePatchInfoBySplittingLineAt(line, 0, { x: 50, y: 0 }, 1)!;
    expect(currentLinePatch).toHaveProperty("body");
    expect(currentLinePatch.body).toEqual(undefined);
    expect(currentLinePatch.curves).toEqual([{ d: { x: 0.5, y: 25 } }]);
    expect(currentLinePatch.q).toEqualPoint({ x: 50, y: 0 });
    expect(newLineSrc.p).toEqualPoint({ x: 50, y: 0 });
    expect(newLineSrc.body).toEqual(undefined);
    expect(newLineSrc.curves).toEqual(undefined);

    expect(getShapePatchInfoBySplittingLineAt(line, 0, { x: 50, y: 0 }, 1)?.slice(0, 2)).toEqual(
      getShapePatchInfoBySplittingLineAt(line, 1, { x: 50, y: 0 }, 1)?.slice(0, 2),
    );
  });

  test("should handle split at the first or last vertex", () => {
    const cb = { id: "b", rate: { x: 0.5, y: 0.5 } };
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      q: { x: 50, y: 50 },
      body: [{ p: { x: 50, y: 0 }, c: cb }],
    });
    expect(getShapePatchInfoBySplittingLineAt(line, 0, { x: 0, y: 0 }, 1)).toBeUndefined();
    expect(getShapePatchInfoBySplittingLineAt(line, 1, { x: 50, y: 50 }, 1)).toBeUndefined();
  });
});

describe("getShapePatchInfoBySplittingLineThrough", () => {
  test("should regard multiple insertions", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }, { p: { x: 100, y: 50 } }, { p: { x: 50, y: 50 } }],
      q: { x: 50, y: -50 },
    });
    const result0 = getShapePatchInfoBySplittingLineThrough(line, { x: 50, y: 0 }, 1)!;
    expect(result0.patch).toEqual({
      body: undefined,
      q: { x: 50, y: 0 },
    });
    expect(result0.patch).toHaveProperty("body");
    expect(result0.newSrcList).toEqual([
      {
        p: { x: 50, y: 0 },
        body: [{ p: { x: 100, y: 0 } }, { p: { x: 100, y: 50 } }, { p: { x: 50, y: 50 } }],
        q: { x: 50, y: 0 },
      },
      {
        p: { x: 50, y: 0 },
        q: { x: 50, y: -50 },
      },
    ]);
    expect(result0.rateList[0]).toBeCloseTo(50 / 300);
    expect(result0.rateList[1]).toBeCloseTo(250 / 300);
  });

  test("should regard multiple insertions", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }, { p: { x: 50, y: 50 } }, { p: { x: 50, y: -50 } }, { p: { x: 0, y: -50 } }],
      q: { x: 100, y: 50 },
    });
    const result0 = getShapePatchInfoBySplittingLineThrough(line, { x: 50, y: 0 }, 1)!;
    expect(result0.patch).toEqual({
      body: undefined,
      q: { x: 50, y: 0 },
    });
    expect(result0.patch).toHaveProperty("body");
    expect(result0.newSrcList).toEqual([
      {
        p: { x: 50, y: 0 },
        body: [{ p: { x: 100, y: 0 } }, { p: { x: 50, y: 50 } }],
        q: { x: 50, y: 0 },
      },
      {
        p: { x: 50, y: 0 },
        body: [{ p: { x: 50, y: -50 } }, { p: { x: 0, y: -50 } }],
        q: { x: 50, y: 0 },
      },
      {
        p: { x: 50, y: 0 },
        q: { x: 100, y: 50 },
      },
    ]);
  });

  test("should regard multiple insertions: at a vertex", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }, { p: { x: 100, y: 0 } }, { p: { x: 100, y: 50 } }, { p: { x: 50, y: 50 } }],
      q: { x: 50, y: -50 },
    });
    const result0 = getShapePatchInfoBySplittingLineThrough(line, { x: 50, y: 0 }, 1)!;
    expect(result0.patch).toEqual({
      body: undefined,
      q: { x: 50, y: 0 },
    });
    expect(result0.patch).toHaveProperty("body");
    expect(result0.newSrcList).toEqual([
      {
        p: { x: 50, y: 0 },
        body: [{ p: { x: 100, y: 0 } }, { p: { x: 100, y: 50 } }, { p: { x: 50, y: 50 } }],
        q: { x: 50, y: 0 },
      },
      {
        p: { x: 50, y: 0 },
        q: { x: 50, y: -50 },
      },
    ]);
    expect(result0.rateList[0]).toBeCloseTo(50 / 300);
    expect(result0.rateList[1]).toBeCloseTo(250 / 300);
  });
});

describe("getNewRateAfterSplit", () => {
  test("should return the correct new rate when the point is on the first part of the split line", () => {
    const s = 0.3;
    const t = 0.5;
    const result = getNewRateAfterSplit(s, t);
    expect(result[0]).toBeCloseTo(0.6);
  });

  test("should return the correct new rate when the point is on the second part of the split line", () => {
    const s = 0.7;
    const t = 0.5;
    const result = getNewRateAfterSplit(s, t);
    expect(result[1]).toBeCloseTo(0.4);
  });

  test("should return [1, undefined] when the point is at the split point", () => {
    const s = 0.5;
    const t = 0.5;
    const result = getNewRateAfterSplit(s, t);
    expect(result).toEqual([1, undefined]);
  });

  test("should handle edge cases where s or t is 0 or 1", () => {
    expect(getNewRateAfterSplit(0, 0.5)).toEqual([0, undefined]);
    expect(getNewRateAfterSplit(1, 0.5)).toEqual([undefined, 1]);
    expect(getNewRateAfterSplit(0.5, 0)).toEqual([undefined, 0.5]);
    expect(getNewRateAfterSplit(0.5, 1)).toEqual([0.5, undefined]);
  });
});

describe("getShapePatchInfoByInsertingVertexAt", () => {
  test("should return line patch when inserting at a point: straight segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      curves: [undefined, { d: { x: 0.5, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    const result0 = getShapePatchInfoByInsertingVertexAt(line, 0, { x: 20, y: 0 }, 1)!;
    expect(result0[0].body).toEqual([{ p: { x: 20, y: 0 } }, { p: { x: 50, y: 0 } }]);
    expect(result0[0].curves).toEqual([undefined, undefined, { d: { x: 0.5, y: 25 } }]);
  });

  test("should return line patch when inserting at a point: curve segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      curves: [undefined, { d: { x: 0.5, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    const result0 = getShapePatchInfoByInsertingVertexAt(line, 1, { x: 75, y: 25 }, 1)!;
    expect(result0[0].body).toEqual([{ p: { x: 50, y: 0 } }, { p: { x: 75, y: 25 } }]);
    expect(result0[0].curves).toHaveLength(3);
    expect(result0[0].curves?.[0]).toBeUndefined();
    expect((result0[0].curves?.[1] as any).d.y).toBeCloseTo(7.32233);
    expect((result0[0].curves?.[2] as any).d.y).toBeCloseTo(7.32233);
  });

  test("should return undefined when the point is at a vertex", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      curves: [undefined, { d: { x: 0.5, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    expect(getShapePatchInfoByInsertingVertexAt(line, 0, { x: 50, y: 0 }, 1)).toBeUndefined();
    expect(getShapePatchInfoByInsertingVertexAt(line, 1, { x: 50, y: 0 }, 1)).toBeUndefined();
  });
});

describe("getShapePatchInfoByInsertingVertexThrough", () => {
  test("should regard multiple insertions", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }, { p: { x: 100, y: 50 } }, { p: { x: 50, y: 50 } }],
      q: { x: 50, y: -50 },
    });
    const result0 = getShapePatchInfoByInsertingVertexThrough(line, { x: 50, y: 0 }, 1)!;
    expect(result0.patch.body).toEqual([
      { p: { x: 50, y: 0 } },
      { p: { x: 100, y: 0 } },
      { p: { x: 100, y: 50 } },
      { p: { x: 50, y: 50 } },
      { p: { x: 50, y: 0 } },
    ]);
    expect(result0.insertions[0][0]).toBe(1);
    expect(result0.insertions[0][1]).toBeCloseTo(50 / 300);
    expect(result0.insertions[1][0]).toBe(5);
    expect(result0.insertions[1][1]).toBeCloseTo(250 / 300);
  });

  test("should regard multiple insertions", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 100, y: 0 } }, { p: { x: 50, y: 50 } }, { p: { x: 50, y: -50 } }, { p: { x: 0, y: -50 } }],
      q: { x: 100, y: 50 },
    });
    const result0 = getShapePatchInfoByInsertingVertexThrough(line, { x: 50, y: 0 }, 1)!;
    expect(result0.patch.body).toEqual([
      { p: { x: 50, y: 0 } },
      { p: { x: 100, y: 0 } },
      { p: { x: 50, y: 50 } },
      { p: { x: 50, y: 0 } },
      { p: { x: 50, y: -50 } },
      { p: { x: 0, y: -50 } },
      { p: { x: 50, y: 0 } },
    ]);
    expect(result0.insertions).toEqual([
      [1, expect.anything()],
      [4, expect.anything()],
      [7, expect.anything()],
    ]);
  });

  test("should regard multiple insertions: at a vertex", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }, { p: { x: 100, y: 0 } }, { p: { x: 100, y: 50 } }, { p: { x: 50, y: 50 } }],
      q: { x: 50, y: -50 },
    });
    const result0 = getShapePatchInfoByInsertingVertexThrough(line, { x: 50, y: 0 }, 1)!;
    expect(result0.patch.body).toEqual([
      { p: { x: 50, y: 0 } },
      { p: { x: 100, y: 0 } },
      { p: { x: 100, y: 50 } },
      { p: { x: 50, y: 50 } },
      { p: { x: 50, y: 0 } },
    ]);
    expect(result0.insertions).toEqual([[5, expect.anything()]]);
    expect(result0.insertions[0][1]).toBeCloseTo(250 / 300);
  });
});

describe("getPatchByExtrudeLineSegment", () => {
  test("should extrude a line segment at an inner segment", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }, { p: { x: 50, y: 50 } }],
      q: { x: 100, y: 50 },
    });
    const translate = { x: 10, y: 10 };
    const result = getPatchByExtrudeLineSegment(line, 1, translate);
    expect(result.body).toEqual([
      { p: { x: 50, y: 0 } },
      { p: { x: 60, y: 10 } },
      { p: { x: 60, y: 60 } },
      { p: { x: 50, y: 50 } },
    ]);
    expect(result.curves).toEqual(undefined);
  });

  test("should handle extrusion at the start of the line", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      q: { x: 100, y: 0 },
    });
    const translate = { x: 10, y: 10 };
    const result = getPatchByExtrudeLineSegment(line, 0, translate);
    expect(result.body).toEqual([{ p: { x: 10, y: 10 } }, { p: { x: 60, y: 10 } }, { p: { x: 50, y: 0 } }]);
  });

  test("should handle extrusion at the end of the line", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }],
      q: { x: 100, y: 0 },
    });
    const translate = { x: 10, y: 10 };
    const result = getPatchByExtrudeLineSegment(line, 1, translate);
    expect(result.body).toEqual([{ p: { x: 50, y: 0 } }, { p: { x: 60, y: 10 } }, { p: { x: 110, y: 10 } }]);
  });

  test("should handle extrusion with curves", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      body: [{ p: { x: 50, y: 0 } }, { p: { x: 50, y: 50 } }],
      curves: [undefined, { c1: { x: 25, y: 25 }, c2: { x: 75, y: 25 } }],
      q: { x: 100, y: 0 },
    });
    const translate = { x: 10, y: 10 };
    const result1 = getPatchByExtrudeLineSegment(line, 0, translate);
    expect(result1.curves).toEqual([undefined, undefined, undefined, { c1: { x: 25, y: 25 }, c2: { x: 75, y: 25 } }]);
    const result2 = getPatchByExtrudeLineSegment(line, 1, translate);
    expect(result2.curves).toEqual([undefined, undefined, { c1: { x: 35, y: 35 }, c2: { x: 85, y: 35 } }]);
    const result3 = getPatchByExtrudeLineSegment(line, 2, translate);
    expect(result3.curves).toEqual([undefined, { c1: { x: 25, y: 25 }, c2: { x: 75, y: 25 } }]);
  });
});

describe("getPatchByCombineLines", () => {
  test("should concatLines two lines", () => {
    const lineA = createShape<LineShape>(getCommonStruct, "line", {
      id: "a",
      p: { x: 0, y: 0 },
      pConnection: { id: "app", rate: { x: 1, y: 2 } },
      body: [{ p: { x: 50, y: 50 }, c: { id: "abb", rate: { x: 3, y: 5 } } }],
      curves: [{ c1: { x: 25, y: 25 }, c2: { x: 75, y: 25 } }],
      q: { x: 100, y: 0 },
      qConnection: { id: "aqq", rate: { x: 10, y: 20 } },
    });
    const lineB = createShape<LineShape>(getCommonStruct, "line", {
      id: "b",
      p: { x: 0, y: 100 },
      pConnection: { id: "bpp", rate: { x: 1, y: 2 } },
      body: [{ p: { x: 50, y: 150 }, c: { id: "abb", rate: { x: 3, y: 5 } } }],
      curves: [{ c1: { x: 25, y: 125 }, c2: { x: 75, y: 125 } }],
      q: { x: 100, y: 100 },
      qConnection: { id: "bqq", rate: { x: 10, y: 20 } },
    });

    const result0 = getPatchByCombineLines(lineA, lineB, 0);
    expect(result0.pConnection).toEqual(lineA.qConnection);
    expect(result0.qConnection).toEqual(lineB.qConnection);

    const result1 = getPatchByCombineLines(lineA, lineB, 1);
    expect(result1.pConnection).toEqual(lineA.qConnection);
    expect(result1.qConnection).toEqual(lineB.pConnection);

    const result2 = getPatchByCombineLines(lineA, lineB, 2);
    expect(result2.pConnection).toEqual(lineA.pConnection);
    expect(result2.qConnection).toEqual(lineB.qConnection);
    expect(getLinePath({ ...lineA, ...result2 })).toEqual([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 50, y: 150 },
      { x: 100, y: 100 },
    ]);
    expect(result2.curves).toEqual([
      { c1: { x: 25, y: 25 }, c2: { x: 75, y: 25 } },
      undefined,
      undefined,
      { c1: { x: 25, y: 125 }, c2: { x: 75, y: 125 } },
    ]);

    const result3 = getPatchByCombineLines(lineA, lineB, 3);
    expect(result3.pConnection).toEqual(lineA.pConnection);
    expect(result3.qConnection).toEqual(lineB.pConnection);
  });
});

describe("getPatchByReverseLine", () => {
  test("should reverse line properties", () => {
    const line = createShape<LineShape>(getCommonStruct, "line", {
      p: { x: 0, y: 0 },
      pConnection: { id: "pp", rate: { x: 1, y: 2 } },
      body: [{ p: { x: 50, y: 0 } }, { p: { x: 50, y: 50 }, c: { id: "bb", rate: { x: 3, y: 5 } } }],
      curves: [undefined, { c1: { x: 25, y: 25 }, c2: { x: 75, y: 25 } }],
      q: { x: 100, y: 0 },
      qConnection: { id: "qq", rate: { x: 10, y: 20 } },
    });
    const patch = getPatchByReverseLine(line);
    const result = { ...line, ...patch };
    expect(getLinePath(line).toReversed()).toEqual(getLinePath(result));
    expect(result.curves).toEqual([{ c2: { x: 25, y: 25 }, c1: { x: 75, y: 25 } }, undefined]);
    expect(getConnections(line).toReversed()).toEqual(getConnections(result));
    expect(line.pHead).toEqual(result.qHead);
    expect(line.qHead).toEqual(result.pHead);
  });
});
