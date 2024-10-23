import { describe, test, expect } from "vitest";
import { getNakedLineShape, patchByFliplineH, patchByFliplineV } from "./line";
import { createShape, getCommonStruct } from "..";
import { LineShape } from "../line";
import { createLineHead } from "../lineHeads";

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
