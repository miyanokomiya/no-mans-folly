import { expect, describe, test } from "vitest";
import { getConnectedLineInfoMap, newConnectedLineHandler } from "./connectedLineHandler";
import { LineShape, struct } from "../shapes/line";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { newShapeComposite } from "./shapeComposite";

describe("newConnectedLineHandler", () => {
  describe("getModifiedMap", () => {
    const l0 = createShape<LineShape>(getCommonStruct, "line", {
      id: "l0",
      pConnection: { rate: { x: 0.5, y: 0.5 }, id: "a" },
      qConnection: { rate: { x: 0.2, y: 0.8 }, id: "b" },
    });
    const elbow0 = createShape<LineShape>(getCommonStruct, "line", {
      id: "elbow0",
      pConnection: { rate: { x: 0, y: 0.5 }, id: "a" },
      qConnection: { rate: { x: 0.5, y: 1 }, id: "b" },
      lineType: "elbow",
    });
    const l1 = createShape<LineShape>(getCommonStruct, "line", {
      id: "l1",
      body: [
        { p: { x: 0, y: 0 }, c: { rate: { x: 0, y: 0.5 }, id: "a" } },
        { p: { x: 10, y: 10 }, c: { rate: { x: 1, y: 0.5 }, id: "b" } },
      ],
    });
    const l2 = createShape<LineShape>(getCommonStruct, "line", {
      id: "l2",
      pConnection: { rate: { x: 0.5, y: 0.5 }, id: "a", optimized: true },
      qConnection: { rate: { x: 0.2, y: 0.8 }, id: "b", optimized: true },
    });
    const a = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a" });
    const b = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "b" });

    test("should return patched lines", () => {
      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l0],
          b: [l0],
        },
        ctx: {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [l0, a, b],
              getStruct: getCommonStruct,
            }),
        },
      });

      expect(
        target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          b: { p: { x: 100, y: 0 }, width: 50, height: 100 } as Partial<RectangleShape>,
        }),
      ).toEqual({
        l0: {
          p: { x: 25, y: 50 },
          q: { x: 110, y: 80 },
        },
      });
    });

    test("should regard body connections", () => {
      const l0 = struct.create({
        id: "l0",
        body: [
          { p: { x: 0, y: 0 }, c: { rate: { x: 0.5, y: 0.5 }, id: "a" } },
          { p: { x: 10, y: 10 }, c: { rate: { x: 0.2, y: 0.8 }, id: "b" } },
        ],
      });
      const a = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a" });
      const b = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "b" });

      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l0],
          b: [l0],
        },
        ctx: {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [l0, a, b],
              getStruct: getCommonStruct,
            }),
        },
      });

      expect(
        target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          b: { p: { x: 100, y: 0 }, width: 50, height: 100 } as Partial<RectangleShape>,
        }),
      ).toEqual({
        l0: {
          body: [
            { p: { x: 25, y: 50 }, c: { rate: { x: 0.5, y: 0.5 }, id: "a" } },
            { p: { x: 110, y: 80 }, c: { rate: { x: 0.2, y: 0.8 }, id: "b" } },
          ],
        },
      });
    });

    test("should regard elbow lines", () => {
      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [elbow0],
          b: [elbow0],
        },
        ctx: {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [elbow0, a, b],
              getStruct: getCommonStruct,
            }),
        },
      });

      expect(
        target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          b: { p: { x: 100, y: 0 }, width: 50, height: 100 } as Partial<RectangleShape>,
        }),
      ).toEqual({
        elbow0: {
          p: { x: 0, y: 50 },
          q: { x: 125, y: 100 },
          body: [{ p: { x: -30, y: 50 } }, { p: { x: -30, y: 130 } }, { p: { x: 125, y: 130 } }],
        },
      });
    });

    test("should regard curve controls", () => {
      const l0 = struct.create({
        id: "l0",
        pConnection: { rate: { x: 0.5, y: 0.5 }, id: "a" },
        qConnection: { rate: { x: 0.5, y: 0.5 }, id: "b" },
        body: [{ p: { x: 0, y: 0 } }],
        curveType: "auto",
      });
      const a = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "a" });
      const b = createShape<RectangleShape>(getCommonStruct, "rectangle", { id: "b" });

      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l0],
          b: [l0],
        },
        ctx: {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [l0, a, b],
              getStruct: getCommonStruct,
            }),
        },
      });

      const ret = target.onModified({
        b: { p: { x: 100, y: 0 }, width: 50, height: 100 } as Partial<RectangleShape>,
      });
      expect(ret.l0.curves?.length).toBe(2);
    });

    describe("when a line is modified but connected shapes arn't", () => {
      test("should delete connections", () => {
        const target = newConnectedLineHandler({
          connectedLinesMap: {
            a: [l0, l1],
            b: [l0, l1],
          },
          ctx: {
            getShapeComposite: () =>
              newShapeComposite({
                shapes: [l0, l1, a, b],
                getStruct: getCommonStruct,
              }),
          },
        });

        const result = target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          l0: { p: { x: 10, y: 10 } },
          l1: { p: { x: 10, y: 10 } },
        });
        expect(result).toEqual({
          l0: { p: { x: 25, y: 50 }, qConnection: undefined },
          l1: {
            body: [{ p: { x: 0, y: 50 }, c: { rate: { x: 0, y: 0.5 }, id: "a" } }, { p: { x: 10, y: 10 } }],
          },
        });
        expect(result.l0).not.toHaveProperty("pConnection");
        expect(result.l0).toHaveProperty("qConnection");
      });

      test("should not delete connections when keepConnection is true", () => {
        const target = newConnectedLineHandler({
          connectedLinesMap: {
            a: [l0, l1],
            b: [l0, l1],
          },
          ctx: {
            getShapeComposite: () =>
              newShapeComposite({
                shapes: [l0, l1, a, b],
                getStruct: getCommonStruct,
              }),
          },
          keepConnection: true,
        });

        const result = target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          l0: { p: { x: 10, y: 10 } },
          l1: { p: { x: 10, y: 10 } },
        });
        expect(result).toEqual({
          l0: { p: { x: 25, y: 50 } },
          l1: {
            body: [
              { p: { x: 0, y: 50 }, c: { rate: { x: 0, y: 0.5 }, id: "a" } },
              { p: { x: 10, y: 10 }, c: { rate: { x: 1, y: 0.5 }, id: "b" } },
            ],
          },
        });
        expect(result.l0).not.toHaveProperty("pConnection");
        expect(result.l0).not.toHaveProperty("qConnection");
      });
    });

    test("should regard optimized connections", () => {
      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l2],
          b: [l2],
        },
        ctx: {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [l2, a, b],
              getStruct: getCommonStruct,
            }),
        },
      });

      expect(
        target.onModified({
          a: { width: 100, height: 100 } as Partial<RectangleShape>,
          b: { p: { x: 200, y: 200 }, width: 100, height: 100 } as Partial<RectangleShape>,
        }),
      ).toEqual({
        l2: {
          p: { x: 100, y: 100 },
          q: { x: 200, y: 200 },
          pConnection: { rate: { x: 1, y: 1 }, id: "a", optimized: true },
          qConnection: { rate: { x: 0, y: 0 }, id: "b", optimized: true },
        },
      });
    });
  });
});

describe("getConnectedLineInfoMap", () => {
  test("should return patched lines", () => {
    const l0 = struct.create({
      id: "l0",
      pConnection: { rate: { x: 0.5, y: 0.5 }, id: "a" },
      qConnection: { rate: { x: 0.2, y: 0.8 }, id: "b" },
    });
    const l1 = struct.create({
      id: "l1",
      qConnection: { rate: { x: 0.2, y: 0.8 }, id: "b" },
    });
    const l2 = struct.create({
      id: "l2",
      qConnection: { rate: { x: 0.2, y: 0.8 }, id: "c" },
    });

    expect(
      getConnectedLineInfoMap(
        {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [l0, l1, l2],
              getStruct: getCommonStruct,
            }),
        },
        ["a", "b"],
      ),
    ).toEqual({ a: [l0], b: [l0, l1] });
  });

  test("should regard body connections", () => {
    const l0 = struct.create({
      id: "l0",
      body: [
        { p: { x: 0, y: 0 }, c: { rate: { x: 0.5, y: 0.5 }, id: "a" } },
        { p: { x: 10, y: 10 }, c: { rate: { x: 0.2, y: 0.8 }, id: "b" } },
      ],
    });
    const l1 = struct.create({
      id: "l1",
    });
    const l2 = struct.create({
      id: "l2",
    });

    expect(
      getConnectedLineInfoMap(
        {
          getShapeComposite: () =>
            newShapeComposite({
              shapes: [l0, l1, l2],
              getStruct: getCommonStruct,
            }),
        },
        ["b"],
      ),
    ).toEqual({ b: [l0] });
  });
});
