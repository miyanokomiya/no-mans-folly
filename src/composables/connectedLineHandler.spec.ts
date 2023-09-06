import { expect, describe, test } from "vitest";
import { getConnectedLineInfoMap, newConnectedLineHandler } from "./connectedLineHandler";
import { struct } from "../shapes/line";

describe("newConnectedLineHandler", () => {
  describe("getModifiedMap", () => {
    test("should return patched lines", () => {
      const l0 = struct.create({
        id: "l0",
        pConnection: { rate: { x: 0.5, y: 0.5 }, id: "a" },
        qConnection: { rate: { x: 0.2, y: 0.8 }, id: "b" },
      });

      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l0],
          b: [l0],
        },
      });

      const pathA = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 100 },
        { x: 0, y: 100 },
      ];
      const pathB = [
        { x: 100, y: 0 },
        { x: 150, y: 0 },
        { x: 150, y: 100 },
        { x: 100, y: 100 },
      ];
      expect(
        target.onModified({
          a: [pathA, 0],
          b: [pathB, 0],
        })
      ).toEqual({
        l0: {
          p: { x: 25, y: 50 },
          q: { x: 110, y: 80 },
        },
      });

      expect(
        target.onModified({
          b: [pathB, 0],
          a: [pathA, 0],
        }),
        "order insensitive"
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

      const target = newConnectedLineHandler({
        connectedLinesMap: {
          a: [l0],
          b: [l0],
        },
      });

      const pathA = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 100 },
        { x: 0, y: 100 },
      ];
      const pathB = [
        { x: 100, y: 0 },
        { x: 150, y: 0 },
        { x: 150, y: 100 },
        { x: 100, y: 100 },
      ];
      expect(
        target.onModified({
          a: [pathA, 0],
          b: [pathB, 0],
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
        getSelectedShapeIdMap: () => ({ b: true }),
      })
    ).toEqual({ b: [l0, l1] });
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
