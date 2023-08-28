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
    });
  });
});
