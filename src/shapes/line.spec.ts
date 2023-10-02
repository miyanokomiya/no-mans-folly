import { expect, describe, test, vi } from "vitest";
import { addNewVertex, deleteVertex, getLinePath, isLineShape, patchConnection, patchVertex, struct } from "./line";

describe("struct", () => {
  describe("create", () => {
    test("should return new shape", () => {
      const result = struct.create();
      expect(result.type).toBe("line");
    });
  });

  describe("render", () => {
    test("should render the shape", () => {
      const shape = struct.create();
      const ctx = {
        beginPath: vi.fn(),
        closePath: vi.fn(),
        lineTo: vi.fn(),
        moveTo: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      };
      struct.render(ctx as any, shape, {
        shapeMap: { [shape.id]: shape },
        treeNodeMap: { [shape.id]: { id: shape.id, children: [] } },
      });
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe("getWrapperRect", () => {
    test("should return the rect", () => {
      const shape = struct.create({ p: { x: 1, y: 2 }, q: { x: 10, y: -20 } });
      expect(struct.getWrapperRect(shape)).toEqual({ x: 1, y: -20, width: 9, height: 22 });
    });
  });

  describe("isPointOn", () => {
    test("should return true if the point is on the shape", () => {
      const shape = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
      expect(struct.isPointOn(shape, { x: -1, y: 0 })).toBe(false);
      expect(struct.isPointOn(shape, { x: 1, y: 0 })).toBe(true);
    });
  });

  describe("resize", () => {
    test("should return resized properties", () => {
      expect(
        struct.resize(
          struct.create({
            p: { x: 1, y: 2 },
            q: { x: 10, y: -20 },
            body: [{ p: { x: 1, y: 2 }, c: { id: "a", rate: { x: 1, y: 0 } } }],
          }),
          [1, 0, 0, 1, 100, 0]
        )
      ).toEqual({
        p: { x: 101, y: 2 },
        q: { x: 110, y: -20 },
        body: [{ p: { x: 101, y: 2 }, c: { id: "a", rate: { x: 1, y: 0 } } }],
      });
    });
  });

  describe("immigrateShapeIds", () => {
    test("should return patched object immigrating ids", () => {
      const shape = struct.create({
        pConnection: { id: "x", rate: { x: 0, y: 0 } },
        qConnection: { id: "y", rate: { x: 0, y: 0 } },
      });
      expect(struct.immigrateShapeIds?.(shape, { y: "b" })).toEqual({
        qConnection: { id: "b", rate: { x: 0, y: 0 } },
      });
    });

    test("should immigrate body", () => {
      const shape = struct.create({
        body: [
          { p: { x: 0, y: 0 }, c: { id: "x", rate: { x: 0, y: 0 } } },
          { p: { x: 0, y: 0 }, c: { id: "y", rate: { x: 0, y: 0 } } },
        ],
      });
      expect(struct.immigrateShapeIds?.(shape, { y: "b" })).toEqual({
        body: [{ p: { x: 0, y: 0 } }, { p: { x: 0, y: 0 }, c: { id: "b", rate: { x: 0, y: 0 } } }],
      });
    });

    test("should return patched object removing ids that aren't found in the new ids when removeNotFound is true", () => {
      const shape = struct.create({
        pConnection: { id: "x", rate: { x: 0, y: 0 } },
        qConnection: { id: "y", rate: { x: 0, y: 0 } },
      });
      expect(struct.immigrateShapeIds?.(shape, { y: "b" })).toEqual({
        pConnection: undefined,
        qConnection: { id: "b", rate: { x: 0, y: 0 } },
      });
    });
  });

  describe("refreshRelation", () => {
    test("should patch object to refresh line connection", () => {
      const shape = struct.create({
        parentId: "a",
        pConnection: { id: "c", rate: { x: 1, y: 1 } },
        qConnection: { id: "d", rate: { x: 1, y: 1 } },
        body: [
          { p: { x: 0, y: 0 }, c: { id: "e", rate: { x: 1, y: 1 } } },
          { p: { x: 0, y: 0 }, c: { id: "f", rate: { x: 1, y: 1 } } },
        ],
      });
      expect(struct.refreshRelation?.(shape, new Set(["c", "d", "e", "f"]))).toEqual(undefined);

      const result0 = struct.refreshRelation?.(shape, new Set([]));
      expect(result0).toEqual({
        pConnection: undefined,
        qConnection: undefined,
        body: [{ p: { x: 0, y: 0 } }, { p: { x: 0, y: 0 } }],
      });
      expect(result0).toHaveProperty("pConnection");
      expect(result0).toHaveProperty("qConnection");

      const result1 = struct.refreshRelation?.(shape, new Set(["c", "e"]));
      expect(result1).toEqual({
        qConnection: undefined,
        body: [{ p: { x: 0, y: 0 }, c: { id: "e", rate: { x: 1, y: 1 } } }, { p: { x: 0, y: 0 } }],
      });
      expect(result1).not.toHaveProperty("pConnection");
      expect(result1).toHaveProperty("qConnection");
    });
  });

  describe("getSnappingLines", () => {
    test("should return each vertices as snapping lines", () => {
      const shape = struct.create({
        p: { x: 1, y: 1 },
        q: { x: 10, y: 10 },
        body: [{ p: { x: 2, y: 3 } }],
      });
      expect(struct.getSnappingLines?.(shape)).toEqual({
        h: [
          [shape.p, shape.p],
          [shape.body![0].p, shape.body![0].p],
          [shape.q, shape.q],
        ],
        v: [
          [shape.p, shape.p],
          [shape.body![0].p, shape.body![0].p],
          [shape.q, shape.q],
        ],
      });
    });
  });
});

describe("getLinePath", () => {
  test("should return vertices of the line", () => {
    const shape0 = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    expect(getLinePath(shape0)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);

    const shape1 = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 }, body: [{ p: { x: 2, y: 3 } }] });
    expect(getLinePath(shape1)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 3 },
      { x: 10, y: 0 },
    ]);
  });
});

describe("patchVertex", () => {
  test("should return patched object of the line", () => {
    const shape0 = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    const v = { x: -1, y: -1 };
    expect(patchVertex(shape0, 0, v, undefined)).toEqual({ p: v });
    expect(patchVertex(shape0, 1, v, undefined)).toEqual({ q: v });
    expect(patchVertex(shape0, 2, v, undefined)).toEqual({});

    const shape1 = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 10, y: 0 },
      body: [{ p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 } }],
    });
    expect(patchVertex(shape1, 0, v, undefined)).toEqual({ p: v });
    expect(patchVertex(shape1, 1, v, undefined)).toEqual({
      body: [{ p: v }, { p: { x: 3, y: 4 } }],
    });
    expect(patchVertex(shape1, 2, v, undefined)).toEqual({
      body: [{ p: { x: 2, y: 3 } }, { p: v }],
    });
    expect(patchVertex(shape1, 3, v, undefined)).toEqual({ q: v });
  });

  test("should patch connection if it's supplied", () => {
    const v = { x: -1, y: -1 };
    const c = { id: "a", rate: { x: 0.5, y: 0.2 } };

    const shape1 = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 10, y: 0 },
      body: [{ p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 } }],
    });
    expect(patchVertex(shape1, 0, v, c)).toEqual({ p: v, pConnection: c });
    expect(patchVertex(shape1, 1, v, c)).toEqual({
      body: [{ p: v, c }, { p: { x: 3, y: 4 } }],
    });
    expect(patchVertex(shape1, 2, v, c)).toEqual({
      body: [{ p: { x: 2, y: 3 } }, { p: v, c }],
    });
    expect(patchVertex(shape1, 3, v, c)).toEqual({ q: v, qConnection: c });
  });
});

describe("patchConnection", () => {
  test("should return patched object of the line", () => {
    const shape0 = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    const v = { id: "a", rate: { x: -1, y: -1 } };
    expect(patchConnection(shape0, 0, v)).toEqual({ pConnection: v });
    expect(patchConnection(shape0, 1, v)).toEqual({ qConnection: v });

    const shape1 = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 10, y: 0 },
      body: [{ p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 } }, { p: { x: 4, y: 5 } }],
    });
    expect(patchConnection(shape1, 0, v)).toEqual({ pConnection: v });
    expect(patchConnection(shape1, 1, v)).toEqual({
      body: [{ p: { x: 2, y: 3 }, c: v }, { p: { x: 3, y: 4 } }, { p: { x: 4, y: 5 } }],
    });
    expect(patchConnection(shape1, 2, v)).toEqual({
      body: [{ p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 }, c: v }, { p: { x: 4, y: 5 } }],
    });
    expect(patchConnection(shape1, 3, v)).toEqual({
      body: [{ p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 } }, { p: { x: 4, y: 5 }, c: v }],
    });
    expect(patchConnection(shape1, 4, v)).toEqual({ qConnection: v });

    const shape2 = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 10, y: 0 },
      body: [
        { p: { x: 2, y: 3 }, c: v },
        { p: { x: 3, y: 4 }, c: v },
        { p: { x: 4, y: 5 }, c: v },
      ],
    });
    expect(patchConnection(shape2, 0, undefined)).toEqual({});
    expect(patchConnection(shape2, 1, undefined)).toEqual({
      body: [
        { p: { x: 2, y: 3 }, c: undefined },
        { p: { x: 3, y: 4 }, c: v },
        { p: { x: 4, y: 5 }, c: v },
      ],
    });
    expect(patchConnection(shape2, 2, undefined)).toEqual({
      body: [
        { p: { x: 2, y: 3 }, c: v },
        { p: { x: 3, y: 4 }, c: undefined },
        { p: { x: 4, y: 5 }, c: v },
      ],
    });
    expect(patchConnection(shape2, 3, undefined)).toEqual({
      body: [
        { p: { x: 2, y: 3 }, c: v },
        { p: { x: 3, y: 4 }, c: v },
        { p: { x: 4, y: 5 }, c: undefined },
      ],
    });
    expect(patchConnection(shape2, 4, undefined)).toEqual({});

    const shape3 = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 10, y: 0 },
      pConnection: { id: "x", rate: { x: 0, y: 0 } },
      qConnection: { id: "y", rate: { x: 0, y: 0 } },
      body: [
        { p: { x: 2, y: 3 }, c: { id: "a", rate: { x: 0, y: 0 } } },
        { p: { x: 3, y: 4 }, c: { id: "b", rate: { x: 0, y: 0 } } },
        { p: { x: 4, y: 5 }, c: { id: "c", rate: { x: 0, y: 0 } } },
      ],
    });
    expect(patchConnection(shape3, 0, undefined)).toEqual({ pConnection: undefined });
    expect(patchConnection(shape3, 1, undefined)).toEqual({
      body: [
        { p: { x: 2, y: 3 } },
        { p: { x: 3, y: 4 }, c: { id: "b", rate: { x: 0, y: 0 } } },
        { p: { x: 4, y: 5 }, c: { id: "c", rate: { x: 0, y: 0 } } },
      ],
    });
    expect(patchConnection(shape3, 2, undefined)).toEqual({
      body: [
        { p: { x: 2, y: 3 }, c: { id: "a", rate: { x: 0, y: 0 } } },
        { p: { x: 3, y: 4 } },
        { p: { x: 4, y: 5 }, c: { id: "c", rate: { x: 0, y: 0 } } },
      ],
    });
    expect(patchConnection(shape3, 3, undefined)).toEqual({
      body: [
        { p: { x: 2, y: 3 }, c: { id: "a", rate: { x: 0, y: 0 } } },
        { p: { x: 3, y: 4 }, c: { id: "b", rate: { x: 0, y: 0 } } },
        { p: { x: 4, y: 5 } },
      ],
    });
    expect(patchConnection(shape3, 4, undefined)).toEqual({ qConnection: undefined });
  });
});

describe("addNewVertex", () => {
  test("should return patched object with new vertex", () => {
    const shape0 = struct.create({ p: { x: 0, y: 0 }, q: { x: 10, y: 0 } });
    const v = { x: -1, y: -1 };
    const c = { id: "a", rate: { x: 0.5, y: 0.2 } };
    expect(addNewVertex(shape0, 0, v)).toEqual({});
    expect(addNewVertex(shape0, 1, v)).toEqual({ body: [{ p: v }] });
    expect(addNewVertex(shape0, 2, v)).toEqual({ body: [{ p: v }] });

    expect(addNewVertex(shape0, 0, v, c)).toEqual({});
    expect(addNewVertex(shape0, 1, v, c)).toEqual({ body: [{ p: v, c }] });
    expect(addNewVertex(shape0, 2, v, c)).toEqual({ body: [{ p: v, c }] });

    const shape1 = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 10, y: 0 },
      body: [{ p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 } }],
    });
    expect(addNewVertex(shape1, 0, v)).toEqual({});
    expect(addNewVertex(shape1, 1, v)).toEqual({
      body: [{ p: v }, { p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 } }],
    });
    expect(addNewVertex(shape1, 2, v)).toEqual({
      body: [{ p: { x: 2, y: 3 } }, { p: v }, { p: { x: 3, y: 4 } }],
    });
    expect(addNewVertex(shape1, 3, v)).toEqual({
      body: [{ p: { x: 2, y: 3 } }, { p: { x: 3, y: 4 } }, { p: v }],
    });
  });
});

describe("deleteVertex", () => {
  test("should return patched object to delete the vertex", () => {
    const shape0 = struct.create({
      p: { x: 0, y: 0 },
      q: { x: 10, y: 0 },
      body: [{ p: { x: 1, y: 1 } }, { p: { x: 2, y: 2 } }, { p: { x: 3, y: 3 } }],
    });
    expect(deleteVertex(shape0, 0)).toEqual({});
    expect(deleteVertex(shape0, 1)).toEqual({
      body: [{ p: { x: 2, y: 2 } }, { p: { x: 3, y: 3 } }],
    });
    expect(deleteVertex(shape0, 2)).toEqual({
      body: [{ p: { x: 1, y: 1 } }, { p: { x: 3, y: 3 } }],
    });
    expect(deleteVertex(shape0, 3)).toEqual({
      body: [{ p: { x: 1, y: 1 } }, { p: { x: 2, y: 2 } }],
    });
    expect(deleteVertex(shape0, 4)).toEqual({});
  });
});

describe("isLineShape", () => {
  test("should return true if the shale is line shape", () => {
    const line = struct.create();
    expect(isLineShape(line)).toBe(true);
    expect(isLineShape({ ...line, type: "unknown" })).toBe(false);
  });
});
