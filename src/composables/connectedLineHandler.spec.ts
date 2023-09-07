import { expect, describe, test } from "vitest";
import { getConnectedLineInfoMap, newConnectedLineHandler } from "./connectedLineHandler";
import { LineShape, struct } from "../shapes/line";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";

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
    const a = createShape<RectangleShape>(getCommonStruct, "rectangle", {});
    const b = createShape<RectangleShape>(getCommonStruct, "rectangle", {});

    test("should return patched lines", () => {
      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l0],
          b: [l0],
        },
        ctx: {
          getShapeStruct: getCommonStruct,
          getShapeMap: () => ({ l0, a, b }),
        },
      });

      expect(
        target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          b: { p: { x: 100, y: 0 }, width: 50, height: 100 } as Partial<RectangleShape>,
        })
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
      const a = createShape<RectangleShape>(getCommonStruct, "rectangle", {});
      const b = createShape<RectangleShape>(getCommonStruct, "rectangle", {});

      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l0],
          b: [l0],
        },
        ctx: {
          getShapeStruct: getCommonStruct,
          getShapeMap: () => ({ l0, a, b }),
        },
      });

      expect(
        target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          b: { p: { x: 100, y: 0 }, width: 50, height: 100 } as Partial<RectangleShape>,
        })
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
          getShapeStruct: getCommonStruct,
          getShapeMap: () => ({ elbow0, a, b }),
        },
      });

      expect(
        target.onModified({
          a: { width: 50, height: 100 } as Partial<RectangleShape>,
          b: { p: { x: 100, y: 0 }, width: 50, height: 100 } as Partial<RectangleShape>,
        })
      ).toEqual({
        elbow0: {
          p: { x: 0, y: 50 },
          q: { x: 125, y: 100 },
          body: [{ p: { x: -30, y: 50 } }, { p: { x: -30, y: 130 } }, { p: { x: 125, y: 130 } }],
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
      getConnectedLineInfoMap({
        getShapeMap: () => ({ l0, l1, l2 }),
        getSelectedShapeIdMap: () => ({ a: true, b: true }),
      })
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
      getConnectedLineInfoMap({
        getShapeMap: () => ({ l0, l1, l2 }),
        getSelectedShapeIdMap: () => ({ b: true }),
      })
    ).toEqual({ b: [l0] });
  });
});
