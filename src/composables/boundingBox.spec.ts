import { expect, describe, test } from "vitest";
import { newBoundingBox, newBoundingBoxResizing, newBoundingBoxRotating } from "./boundingBox";
import { getRectPoints } from "../utils/geometry";
import { createStyleScheme } from "../models/factories";
import { applyAffine } from "okageo";

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

      expect(target.hitTest({ x: 120, y: -20 })).toEqual({ type: "rotation", index: 0 });
    });
  });

  describe("getResizingBase", () => {
    test("should return resising base information", () => {
      const target = newBoundingBox({
        path: getRectPoints({ x: 0, y: 0, width: 100, height: 200 }),
        styleScheme: createStyleScheme(),
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

    test("should snap loosely", () => {
      const result0 = newBoundingBoxRotating({
        rotation: Math.PI / 2,
        origin: { x: 0, y: 0 },
      });
      const a0 = result0.getAffine({ x: 0, y: 10 }, { x: 9.9, y: 0.1 });
      expect(a0[0]).toBeCloseTo(Math.cos(-Math.PI / 2));
      expect(a0[1]).toBeCloseTo(Math.sin(-Math.PI / 2));

      const a1 = result0.getAffine({ x: 0, y: 10 }, { x: 9, y: 1 });
      expect(a1[0]).not.toBeCloseTo(Math.cos(-Math.PI / 2));
    });

    test("should snap when the flag is supplied", () => {
      const result0 = newBoundingBoxRotating({
        rotation: Math.PI / 2,
        origin: { x: 0, y: 0 },
      });
      const a0 = result0.getAffine({ x: 0, y: 10 }, { x: 9, y: 1 }, true);
      expect(a0[0]).toBeCloseTo(Math.cos(-Math.PI / 2));
      expect(a0[1]).toBeCloseTo(Math.sin(-Math.PI / 2));
    });
  });
});
