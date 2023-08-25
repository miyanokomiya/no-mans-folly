import { expect, describe, test } from "vitest";
import { newBoundingBox } from "./boundingBox";
import { getRectPoints } from "../utils/geometry";
import { createStyleScheme } from "../models/factories";

describe("newBoundingBox", () => {
  describe("hitTest", () => {
    test("should return hit information", () => {
      const target = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 100, height: 200 }),
        styleScheme: createStyleScheme(),
      });
      expect(target.hitTest({ x: -10, y: 0 })).toEqual(undefined);
      expect(target.hitTest({ x: 0, y: 0 })).toEqual({ type: "corner", index: 0 });
      expect(target.hitTest({ x: 100, y: 0 })).toEqual({ type: "corner", index: 1 });
      expect(target.hitTest({ x: 100, y: 200 })).toEqual({ type: "corner", index: 2 });
      expect(target.hitTest({ x: 0, y: 200 })).toEqual({ type: "corner", index: 3 });

      expect(target.hitTest({ x: 10, y: 0 })).toEqual({ type: "segment", index: 0 });
      expect(target.hitTest({ x: 100, y: 10 })).toEqual({ type: "segment", index: 1 });
      expect(target.hitTest({ x: 80, y: 200 })).toEqual({ type: "segment", index: 2 });
      expect(target.hitTest({ x: 0, y: 170 })).toEqual({ type: "segment", index: 3 });

      expect(target.hitTest({ x: 30, y: 50 })).toEqual({ type: "area", index: 0 });
    });
  });
});
