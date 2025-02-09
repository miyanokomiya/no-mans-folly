import { describe, test, expect } from "vitest";
import { findBetterRectanglePositionsNearByShape, findBetterShapePositionsNearByShape } from "./shapePosition";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { newShapeComposite } from "./shapeComposite";

const rectA = createShape<RectangleShape>(getCommonStruct, "rectangle", {
  id: "rectA",
  p: { x: 0, y: 0 },
  width: 100,
  height: 100,
});
const rectB = {
  ...rectA,
  id: "rectB",
  height: 200,
};
const rectC = {
  ...rectA,
  id: "rectC",
  width: 200,
  rotation: Math.PI / 2,
};
const rectD = {
  ...rectA,
  id: "rectD",
  p: { x: -150, y: 0 },
};
const src = {
  ...rectA,
  id: "src",
  p: { x: 0, y: 0 },
  width: 300,
  height: 300,
};

describe("findBetterShapePositionsNearByShape", () => {
  test("should return shape positions near by the source shape based on their wrapper rectangles", () => {
    const shapeComposite = newShapeComposite({
      shapes: [rectA, rectB, rectC, src],
      getStruct: getCommonStruct,
    });
    expect(findBetterShapePositionsNearByShape(shapeComposite, src.id, [rectA.id, rectB.id, rectC.id])).toEqualPoints([
      { x: -140, y: 0 },
      { x: -140, y: 120 },
      { x: -190, y: 390 },
    ]);
  });

  test("should return shape positions that don't overlap others", () => {
    const shapeComposite = newShapeComposite({
      shapes: [rectA, rectB, rectC, rectD, src],
      getStruct: getCommonStruct,
    });
    expect(findBetterShapePositionsNearByShape(shapeComposite, src.id, [rectA.id, rectB.id, rectC.id])).toEqualPoints([
      { x: -140, y: 120 },
      { x: -140, y: 240 },
      { x: -190, y: 510 },
    ]);
  });
});

describe("findBetterRectanglePositionsNearByShape", () => {
  test("should return shape positions near by the source shape based on their wrapper rectangles", () => {
    const shapeComposite = newShapeComposite({
      shapes: [rectA, rectB, rectC, src],
      getStruct: getCommonStruct,
    });
    expect(findBetterRectanglePositionsNearByShape(shapeComposite, src.id, { width: 100, height: 200 })).toEqualPoint({
      x: -140,
      y: 0,
    });
  });

  test("should return shape positions that don't overlap others", () => {
    const shapeComposite = newShapeComposite({
      shapes: [rectA, rectB, rectC, rectD, src],
      getStruct: getCommonStruct,
    });
    expect(findBetterRectanglePositionsNearByShape(shapeComposite, src.id, { width: 100, height: 200 })).toEqualPoint({
      x: -140,
      y: 120,
    });
  });
});
