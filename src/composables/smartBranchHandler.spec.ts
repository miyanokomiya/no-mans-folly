import { describe, test, expect } from "vitest";
import {
  getAbovePosition,
  getBelowPosition,
  getBranchObstacles,
  getLeftPosition,
  getRightPosition,
  newSmartBranchHandler,
} from "./smartBranchHandler";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { RectPolygonShape } from "../shapes/rectPolygon";
import { LineShape } from "../shapes/line";

describe("newSmartBranchHandler", () => {
  const rect = createShape(getCommonStruct, "rectangle", { id: "a", findex: "aA" });
  const shapeComposite = newShapeComposite({
    shapes: [rect],
    getStruct: getCommonStruct,
  });
  const target = newSmartBranchHandler({
    getShapeComposite: () => shapeComposite,
    targetId: "a",
  });

  describe("hitTest", () => {
    test("should return branch data when a point is on one of the anchors", () => {
      expect(target.hitTest({ x: 50, y: -40 }, 1)?.index).toBe(0);
      expect(target.hitTest({ x: 140, y: 50 }, 1)?.index).toBe(1);
      expect(target.hitTest({ x: 50, y: 140 }, 1)?.index).toBe(2);
      expect(target.hitTest({ x: -40, y: 50 }, 1)?.index).toBe(3);
    });
  });

  describe("createBranch", () => {
    test("should return branch shapes based on the hit result", () => {
      const hit = target.hitTest({ x: 140, y: 50 }, 1);
      const result = target.createBranch(hit!.index, () => "b", rect.findex);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("rectangle");
      expect(result[0].findex > rect.findex).toBe(true);
      expect(result[1].type).toBe("line");
      expect(result[1].findex > result[0].findex).toBe(true);
    });
  });

  describe("changeBranchTemplate", () => {
    test("should return new handler with the template", () => {
      const result0 = target.changeBranchTemplate({ smartBranchChildMargin: 200 });
      expect(target.createBranch(0, () => "b", rect.findex)[0].p).toEqualPoint({ x: 0, y: -200 });
      expect(result0.createBranch(0, () => "b", rect.findex)[0].p).toEqualPoint({ x: 0, y: -300 });
      expect(result0.retrieveHitResult()).toBe(undefined);
    });

    test("should migrate hit result with the handler", () => {
      const hit = target.hitTest({ x: 140, y: 50 }, 1);
      target.saveHitResult(hit);
      const result0 = target.changeBranchTemplate({ smartBranchChildMargin: 200 });
      expect(hit?.previewShapes[0].p).toEqualPoint({ x: 200, y: 0 });
      expect(result0.retrieveHitResult()?.previewShapes[0].p).toEqualPoint({ x: 300, y: 0 });
    });
  });

  describe("clone", () => {
    const rectB = createShape(getCommonStruct, "rectangle", { id: "b", findex: "aB", p: { x: 0, y: 200 } });
    const shapeComposite = newShapeComposite({
      shapes: [rect, rectB],
      getStruct: getCommonStruct,
    });
    const target = newSmartBranchHandler({
      getShapeComposite: () => shapeComposite,
      targetId: "a",
    });

    test("should return new handler with patched option", () => {
      const result0 = target.clone({ ignoreObstacles: true });
      expect(target.createBranch(2, () => "c", rect.findex)[0].p).toEqualPoint({ x: 125, y: 200 });
      expect(result0.createBranch(2, () => "c", rect.findex)[0].p).toEqualPoint({ x: 0, y: 200 });
      expect(result0.retrieveHitResult()).toBe(undefined);
    });

    test("should migrate hit result with the handler", () => {
      const hit = target.hitTest({ x: 50, y: 140 }, 1);
      target.saveHitResult(hit);
      const result0 = target.clone({ ignoreObstacles: true });
      expect(hit?.previewShapes[0].p).toEqualPoint({ x: 125, y: 200 });
      expect(result0.retrieveHitResult()?.previewShapes[0].p).toEqualPoint({ x: 0, y: 200 });
    });
  });
});

describe("getBranchObstacles", () => {
  test("should ignore lines and shapes with special order priority", () => {
    const rect = createShape<RectPolygonShape>(getCommonStruct, "rectangle", { id: "rect", width: 10, height: 10 });
    const line = createShape<LineShape>(getCommonStruct, "line", {
      id: "line",
      p: { x: 10, y: 10 },
      q: { x: 20, y: 20 },
    });
    const frame = createShape<RectPolygonShape>(getCommonStruct, "frame", {
      id: "frame",
      p: { x: 30, y: 30 },
      width: 10,
      height: 10,
    });
    const shapeComposite = newShapeComposite({
      shapes: [rect, line, frame],
      getStruct: getCommonStruct,
    });
    const result = getBranchObstacles(shapeComposite);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqualRect({ x: 0, y: 0, width: 10, height: 10 });
  });
});

describe("getBelowPosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getBelowPosition(rect, [], 100, 25)).toEqual({ x: 0, y: 200 });
    expect(getBelowPosition(rect, [{ x: 0, y: 220, width: 100, height: 100 }], 100, 25)).toEqual({ x: 125, y: 200 });
    expect(
      getBelowPosition(
        rect,
        [
          { x: 0, y: 220, width: 100, height: 100 },
          { x: 150, y: 220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -125, y: 200 });
    expect(
      getBelowPosition(
        rect,
        [
          { x: 0, y: 220, width: 100, height: 100 },
          { x: 120, y: 220, width: 100, height: 100 },
          { x: -130, y: 220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 250, y: 200 });
  });
});

describe("getAbovePosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getAbovePosition(rect, [], 100, 25)).toEqual({ x: 0, y: -200 });
    expect(getAbovePosition(rect, [{ x: 0, y: -220, width: 100, height: 100 }], 100, 25)).toEqual({ x: 125, y: -200 });
    expect(
      getAbovePosition(
        rect,
        [
          { x: 0, y: -220, width: 100, height: 100 },
          { x: 150, y: -220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -125, y: -200 });
    expect(
      getAbovePosition(
        rect,
        [
          { x: 0, y: -220, width: 100, height: 100 },
          { x: 120, y: -220, width: 100, height: 100 },
          { x: -130, y: -220, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 250, y: -200 });
  });
});

describe("getRightPosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getRightPosition(rect, [], 100, 25)).toEqual({ x: 200, y: 0 });
    expect(getRightPosition(rect, [{ x: 220, y: 0, width: 100, height: 100 }], 100, 25)).toEqual({ x: 200, y: 125 });
    expect(
      getRightPosition(
        rect,
        [
          { x: 220, y: 0, width: 100, height: 100 },
          { x: 220, y: 150, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 200, y: -125 });
    expect(
      getRightPosition(
        rect,
        [
          { x: 220, y: 0, width: 100, height: 100 },
          { x: 220, y: 120, width: 100, height: 100 },
          { x: 220, y: -130, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: 200, y: 250 });
  });
});

describe("getLeftPosition", () => {
  test("should return better position to avoid obstacles", () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 };
    expect(getLeftPosition(rect, [], 100, 25)).toEqual({ x: -200, y: 0 });
    expect(getLeftPosition(rect, [{ x: -220, y: 0, width: 100, height: 100 }], 100, 25)).toEqual({ x: -200, y: 125 });
    expect(
      getLeftPosition(
        rect,
        [
          { x: -220, y: 0, width: 100, height: 100 },
          { x: -220, y: 150, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -200, y: -125 });
    expect(
      getLeftPosition(
        rect,
        [
          { x: -220, y: 0, width: 100, height: 100 },
          { x: -220, y: 120, width: 100, height: 100 },
          { x: -220, y: -130, width: 100, height: 100 },
        ],
        100,
        25,
      ),
    ).toEqual({ x: -200, y: 250 });
  });
});
