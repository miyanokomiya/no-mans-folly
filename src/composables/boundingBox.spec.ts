import { expect, describe, test } from "vitest";
import { newBoundingBox, newBoundingBoxResizing, newBoundingBoxRotating } from "./boundingBox";
import { getRectPoints } from "../utils/geometry";
import { applyAffine, getDistance } from "okageo";

describe("newBoundingBox", () => {
  describe("hitTest", () => {
    test("should return hit information", () => {
      const target = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 100, height: 200 }),
      });
      expect(target.hitTest({ x: -10, y: 0 }, 1)).toEqual(undefined);
      expect(target.hitTest({ x: 0, y: 0 }, 1)).toEqual({ type: "corner", index: 0 });
      expect(target.hitTest({ x: 100, y: 0 }, 1)).toEqual({ type: "corner", index: 1 });
      expect(target.hitTest({ x: 100, y: 200 }, 1)).toEqual({ type: "corner", index: 2 });
      expect(target.hitTest({ x: 0, y: 200 }, 1)).toEqual({ type: "corner", index: 3 });

      expect(target.hitTest({ x: 10, y: 0 }, 1)).toEqual({ type: "segment", index: 0 });
      expect(target.hitTest({ x: 100, y: 10 }, 1)).toEqual({ type: "segment", index: 1 });
      expect(target.hitTest({ x: 80, y: 200 }, 1)).toEqual({ type: "segment", index: 2 });
      expect(target.hitTest({ x: 0, y: 170 }, 1)).toEqual({ type: "segment", index: 3 });

      expect(target.hitTest({ x: 30, y: 50 }, 1)).toEqual({ type: "area", index: 0 });

      expect(target.hitTest({ x: 120, y: -20 }, 1)).toEqual({ type: "rotation", index: 0 });
    });

    test("should check the anchor for moving when noMoveAnchor isn't set true", () => {
      const target0 = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 100, height: 200 }),
        noMoveAnchor: true,
      });
      expect(target0.hitTest({ x: -18, y: -18 }, 1)).toEqual(undefined);

      const target1 = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 100, height: 200 }),
      });
      expect(target1.hitTest({ x: -18, y: -18 }, 1)).toEqual({ type: "move", index: 0 });
    });
  });

  describe("getResizingBase", () => {
    test("should return resising base information", () => {
      const target = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 100, height: 200 }),
      });

      expect(target.getResizingBase({ type: "corner", index: 0 })).toEqual({
        direction: { x: -100, y: -200 },
        origin: { x: 100, y: 200 },
      });
      expect(target.getResizingBase({ type: "corner", index: 1 })).toEqual({
        direction: { x: 100, y: -200 },
        origin: { x: 0, y: 200 },
      });
      expect(target.getResizingBase({ type: "corner", index: 2 })).toEqual({
        direction: { x: 100, y: 200 },
        origin: { x: 0, y: 0 },
      });
      expect(target.getResizingBase({ type: "corner", index: 3 })).toEqual({
        direction: { x: -100, y: 200 },
        origin: { x: 100, y: 0 },
      });

      expect(target.getResizingBase({ type: "segment", index: 0 })).toEqual({
        direction: { x: 0, y: -200 },
        origin: { x: 50, y: 200 },
      });
      expect(target.getResizingBase({ type: "segment", index: 1 })).toEqual({
        direction: { x: 100, y: 0 },
        origin: { x: 0, y: 100 },
      });
      expect(target.getResizingBase({ type: "segment", index: 2 })).toEqual({
        direction: { x: 0, y: 200 },
        origin: { x: 50, y: 0 },
      });
      expect(target.getResizingBase({ type: "segment", index: 3 })).toEqual({
        direction: { x: -100, y: 0 },
        origin: { x: 100, y: 100 },
      });
    });
  });
});

describe("newBoundingBoxResizing", () => {
  describe("getAffine", () => {
    test("should return resizing affine matrix: at a corner", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "corner", index: 0 },
        resizingBase: {
          direction: { x: -100, y: -100 },
          origin: { x: 100, y: 100 },
        },
      });
      const affine0 = corner0.getAffine({ x: -10, y: -20 });
      expect(affine0[0]).toBeCloseTo(1.1);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(1.2);
      expect(affine0[4]).toBeCloseTo(-10);
      expect(affine0[5]).toBeCloseTo(-20);
    });

    test("should return resizing affine matrix: at a corner && keep aspect", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "corner", index: 0 },
        resizingBase: {
          direction: { x: -100, y: -100 },
          origin: { x: 100, y: 100 },
        },
      });
      const affine0 = corner0.getAffine({ x: -30, y: -50 }, { keepAspect: true });
      expect(affine0[0]).toBeCloseTo(1.4);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(1.4);
      expect(affine0[4]).toBeCloseTo(-40);
      expect(affine0[5]).toBeCloseTo(-40);
    });

    test("should return resizing affine matrix: at a corner && centralize", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "corner", index: 0 },
        resizingBase: {
          direction: { x: -100, y: -100 },
          origin: { x: 100, y: 100 },
        },
      });
      const affine0 = corner0.getAffine({ x: -10, y: -20 }, { centralize: true });
      expect(affine0[0]).toBeCloseTo(1.2);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(1.4);
      expect(affine0[4]).toBeCloseTo(-10);
      expect(affine0[5]).toBeCloseTo(-20);
    });

    test("should return resizing affine matrix: at a segment", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 0 },
        resizingBase: {
          direction: { x: 0, y: -100 },
          origin: { x: 50, y: 100 },
        },
      });
      const affine0 = corner0.getAffine({ x: -10, y: -20 });
      expect(affine0[0]).toBeCloseTo(1);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(1.2);
      expect(affine0[4]).toBeCloseTo(0);
      expect(affine0[5]).toBeCloseTo(-20);

      const corner1 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 1 },
        resizingBase: {
          direction: { x: 100, y: 0 },
          origin: { x: 0, y: 50 },
        },
      });
      const affine1 = corner1.getAffine({ x: -10, y: -20 });
      expect(affine1[0]).toBeCloseTo(0.9);
      expect(affine1[1]).toBeCloseTo(0);
      expect(affine1[2]).toBeCloseTo(0);
      expect(affine1[3]).toBeCloseTo(1);
      expect(affine1[4]).toBeCloseTo(0);
      expect(affine1[5]).toBeCloseTo(0);
    });

    test("should return resizing affine matrix: at a segment && keep aspect", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 0 },
        resizingBase: {
          direction: { x: 0, y: -100 },
          origin: { x: 50, y: 100 },
        },
      });
      const affine0 = corner0.getAffine({ x: -10, y: -20 }, { keepAspect: true });
      expect(affine0[0]).toBeCloseTo(1.2);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(1.2);
      expect(affine0[4]).toBeCloseTo(-10);
      expect(affine0[5]).toBeCloseTo(-20);

      const corner1 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 1 },
        resizingBase: {
          direction: { x: 100, y: 0 },
          origin: { x: 0, y: 50 },
        },
      });
      const affine1 = corner1.getAffine({ x: -10, y: -20 }, { keepAspect: true });
      expect(affine1[0]).toBeCloseTo(0.9);
      expect(affine1[1]).toBeCloseTo(0);
      expect(affine1[2]).toBeCloseTo(0);
      expect(affine1[3]).toBeCloseTo(0.9);
      expect(affine1[4]).toBeCloseTo(0);
      expect(affine1[5]).toBeCloseTo(5);
    });

    test("should return resizing affine matrix: at a segment && centralize", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 0 },
        resizingBase: {
          direction: { x: 0, y: -100 },
          origin: { x: 50, y: 100 },
        },
      });
      const affine0 = corner0.getAffine({ x: -10, y: -20 }, { centralize: true });
      expect(affine0[0]).toBeCloseTo(1);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(1.4);
      expect(affine0[4]).toBeCloseTo(0);
      expect(affine0[5]).toBeCloseTo(-20);

      const corner1 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 1 },
        resizingBase: {
          direction: { x: 100, y: 0 },
          origin: { x: 0, y: 50 },
        },
      });
      const affine1 = corner1.getAffine({ x: -10, y: -20 }, { centralize: true });
      expect(affine1[0]).toBeCloseTo(0.8);
      expect(affine1[1]).toBeCloseTo(0);
      expect(affine1[2]).toBeCloseTo(0);
      expect(affine1[3]).toBeCloseTo(1);
      expect(affine1[4]).toBeCloseTo(10);
      expect(affine1[5]).toBeCloseTo(0);
    });

    test("should keep minimum size", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "corner", index: 0 },
        resizingBase: {
          direction: { x: 100, y: 100 },
          origin: { x: 0, y: 0 },
        },
      });
      const affine0 = corner0.getAffine({ x: -120, y: -100 });
      expect(affine0[0]).toBeCloseTo(0.1);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(0.1);
      expect(affine0[4]).toBeCloseTo(0);
      expect(affine0[5]).toBeCloseTo(0);
    });

    test("should return resizing affine matrix: at a segment && text mode", () => {
      // Should keep aspect ratio when resizing vertically
      const corner0 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 0 },
        resizingBase: {
          direction: { x: 0, y: -100 },
          origin: { x: 50, y: 100 },
        },
        mode: "text",
      });
      const affine0 = corner0.getAffine({ x: 0, y: -20 });
      expect(affine0[0]).toBeCloseTo(1.2);
      expect(affine0[1]).toBeCloseTo(0);
      expect(affine0[2]).toBeCloseTo(0);
      expect(affine0[3]).toBeCloseTo(1.2);
      expect(affine0[4]).toBeCloseTo(-10);
      expect(affine0[5]).toBeCloseTo(-20);

      // Should resize as usual when resizing horizontally
      const corner1 = newBoundingBoxResizing({
        rotation: 0,
        hitResult: { type: "segment", index: 1 },
        resizingBase: {
          direction: { x: 100, y: 0 },
          origin: { x: 0, y: 50 },
        },
        mode: "text",
      });
      const affine1 = corner1.getAffine({ x: 10, y: 0 });
      expect(affine1[0]).toBeCloseTo(1.1);
      expect(affine1[1]).toBeCloseTo(0);
      expect(affine1[2]).toBeCloseTo(0);
      expect(affine1[3]).toBeCloseTo(1);
      expect(affine1[4]).toBeCloseTo(0);
      expect(affine1[5]).toBeCloseTo(0);
    });
  });

  describe("getAffineAfterSnapping", () => {
    test("should return resizing affine matrix: at a corner && keep aspect", () => {
      const corner0 = newBoundingBoxResizing({
        rotation: Math.PI / 4,
        hitResult: { type: "corner", index: 2 },
        resizingBase: {
          direction: { x: 100, y: 0 },
          origin: { x: 0, y: 0 },
        },
      });
      const affine0 = corner0.getAffineAfterSnapping(
        { x: 10, y: 20 },
        [
          [
            { x: 100, y: 50 },
            { x: 110, y: 50 },
          ],
        ],
        [
          { x: 130, y: 0 },
          { x: 130, y: 100 },
        ],
        { keepAspect: true },
      );
      expect(affine0[0][0]).toBeCloseTo(1.3);
      expect(affine0[0][1]).toBeCloseTo(0);
      expect(affine0[0][2]).toBeCloseTo(0);
      expect(affine0[0][3]).toBeCloseTo(1.3);
      expect(affine0[0][4]).toBeCloseTo(0);
      expect(affine0[0][5]).toBeCloseTo(0);
      expect(affine0[1]).toBeCloseTo(getDistance({ x: 110, y: 50 }, applyAffine(affine0[0], { x: 100, y: 50 })));
      expect(affine0[2]).toEqual([
        { x: 130, y: 0 },
        { x: 130, y: 100 },
      ]);
    });
  });
});

describe("newBoundingBoxRotating", () => {
  describe("getAffine", () => {
    test("should return rotating affine matrix", () => {
      const result0 = newBoundingBoxRotating({
        rotation: 0,
        origin: { x: 10, y: 10 },
      });
      const p0 = applyAffine(result0.getAffine({ x: 20, y: 10 }, { x: 10, y: 20 }), { x: 20, y: 10 });
      expect(p0.x).toBeCloseTo(10);
      expect(p0.y).toBeCloseTo(20);

      const p1 = applyAffine(result0.getAffine({ x: 10, y: 0 }, { x: 0, y: 10 }), { x: 20, y: 10 });
      expect(p1.x).toBeCloseTo(10);
      expect(p1.y).toBeCloseTo(0);
    });

    test("should round rotation unless freeAngle is set false", () => {
      const target = newBoundingBoxRotating({
        rotation: Math.PI / 2,
        origin: { x: 0, y: 0 },
      });
      const a0 = target.getAffine({ x: 0, y: 10 }, { x: 9.9, y: 0.1 });
      expect((Math.acos(a0[0]) * 180) / Math.PI).toBeCloseTo(89);

      const a1 = target.getAffine({ x: 0, y: 10 }, { x: 9.9, y: 0.1 }, true);
      expect((Math.acos(a1[0]) * 180) / Math.PI).not.toBeCloseTo(89);
    });
  });
});
