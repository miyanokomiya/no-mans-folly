import { expect, describe, test } from "vitest";
import { newLineBounding } from "./lineBounding";
import { struct } from "../shapes/line";
import { createStyleScheme } from "../models/factories";

describe("newLineBounding", () => {
  describe("hitTest", () => {
    const option = {
      lineShape: struct.create({ p: { x: 0, y: 0 }, q: { x: 100, y: 0 } }),
      styleScheme: createStyleScheme(),
      scale: 1,
    };

    test("should return hit result for the line", () => {
      const target = newLineBounding(option);

      expect(target.hitTest({ x: -10, y: 0 })).toEqual(undefined);

      expect(target.hitTest({ x: -30, y: 0 })).toEqual({
        type: "move-anchor",
        index: 0,
      });

      expect(target.hitTest({ x: -1, y: 0 })).toEqual({
        type: "vertex",
        index: 0,
      });
      expect(target.hitTest({ x: 1, y: 0 })).toEqual({
        type: "vertex",
        index: 0,
      });
      expect(target.hitTest({ x: 99, y: 0 })).toEqual({
        type: "vertex",
        index: 1,
      });
      expect(target.hitTest({ x: 101, y: 0 })).toEqual({
        type: "vertex",
        index: 1,
      });

      expect(target.hitTest({ x: 10, y: -10 })).toEqual(undefined);
      expect(target.hitTest({ x: 10, y: 10 })).toEqual(undefined);
      expect(target.hitTest({ x: 10, y: -1 })).toEqual({
        type: "edge",
        index: 0,
      });
      expect(target.hitTest({ x: 90, y: 1 })).toEqual({
        type: "edge",
        index: 0,
      });
      expect(target.hitTest({ x: 25, y: 1 })).toEqual({
        type: "new-vertex-anchor",
        index: 0,
      });
      expect(target.hitTest({ x: 50, y: 1 })).toEqual({
        type: "arc-anchor",
        index: 0,
      });
    });

    test("should take care of bezier curve", () => {
      const target = newLineBounding({
        ...option,
        lineShape: struct.create({
          p: { x: 0, y: 0 },
          q: { x: 100, y: 100 },
          body: [{ p: { x: 100, y: 0 } }],
          curves: [
            { c1: { x: 20, y: -50 }, c2: { x: 80, y: -50 } },
            { c1: { x: 150, y: 20 }, c2: { x: 150, y: 80 } },
          ],
          curveType: "auto",
        }),
      });

      expect(target.hitTest({ x: -1, y: 0 })).toEqual({
        type: "vertex",
        index: 0,
      });
      expect(target.hitTest({ x: 30, y: -30 })).toEqual({
        type: "edge",
        index: 0,
      });
      expect(target.hitTest({ x: 50, y: 0 })).toEqual(undefined);
      expect(target.hitTest({ x: 25, y: -30 })).toEqual({
        type: "new-vertex-anchor",
        index: 0,
      });
      expect(target.hitTest({ x: 50, y: -40 })).toEqual(undefined);
    });

    describe("anchors for optimization", () => {
      test("should check optimize anchors when a point is connected to the center of a shape", () => {
        const option = {
          lineShape: struct.create({
            p: { x: 0, y: 0 },
            q: { x: 100, y: 0 },
            pConnection: { id: "a", rate: { x: 0.5, y: 0.5 } },
            qConnection: { id: "b", rate: { x: 0.5, y: 0.5 } },
          }),
          styleScheme: createStyleScheme(),
          scale: 1,
        };
        const target = newLineBounding(option);

        expect(target.hitTest({ x: 0, y: -20 })).toEqual({
          type: "optimize",
          index: 0,
        });
        expect(target.hitTest({ x: 100, y: 20 })).toEqual({
          type: "optimize",
          index: 1,
        });
      });
      test("should not check optimize anchors when both start and end point are connected to the same shape", () => {
        const option = {
          lineShape: struct.create({
            p: { x: 0, y: 0 },
            q: { x: 100, y: 0 },
            pConnection: { id: "a", rate: { x: 0.1, y: 0.1 } },
            qConnection: { id: "a", rate: { x: 0.5, y: 0.5 } },
          }),
          styleScheme: createStyleScheme(),
          scale: 1,
        };
        const target = newLineBounding(option);

        expect(target.hitTest({ x: 0, y: -20 })).toEqual(undefined);
        expect(target.hitTest({ x: 100, y: 20 })).toEqual(undefined);
      });
    });
  });
});
