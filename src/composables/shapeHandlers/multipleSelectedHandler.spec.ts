import { describe, test, expect } from "vitest";
import { newMultipleSelectedHandler } from "./multipleSelectedHandler";
import { newShapeComposite } from "../shapeComposite";
import { createShape, getCommonStruct } from "../../shapes";
import { RectangleShape } from "../../shapes/rectangle";
import { LineShape } from "../../shapes/line";

describe("hitTest", () => {
  test("should check shapes that have different rotation from the option", () => {
    const a = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "a",
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      rotation: 0,
    });
    const b = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "b",
      p: { x: 0, y: 10 },
      width: 10,
      height: 10,
      rotation: Math.PI / 2,
    });
    const c = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "c",
      p: { x: 0, y: 20 },
      width: 10,
      height: 10,
      rotation: Math.PI / 2,
    });
    const d = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "d",
      p: { x: 0, y: 30 },
      width: 10,
      height: 10,
      rotation: Math.PI / 4,
    });
    const shapes = [a, b, c, d];
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes,
    });

    const target0 = newMultipleSelectedHandler({
      getShapeComposite: () => shapeComposite,
      targetIds: shapes.map((s) => s.id),
      rotation: 0,
    });
    expect(target0.hitTest({ x: 5, y: 4 }, 1)).toBe(undefined);
    expect(target0.hitTest({ x: 5, y: 14 }, 1)).toEqual({
      type: "rotation",
      info: [b.id, b.rotation, { x: 5, y: 15 }],
    });
    expect(target0.hitTest({ x: 5, y: 24 }, 1)).toEqual({
      type: "rotation",
      info: [c.id, c.rotation, { x: 5, y: 25 }],
    });
    expect(target0.hitTest({ x: 5, y: 34 }, 1)).toEqual({
      type: "rotation",
      info: [d.id, d.rotation, { x: 5, y: 35 }],
    });

    const target1 = newMultipleSelectedHandler({
      getShapeComposite: () => shapeComposite,
      targetIds: shapes.map((s) => s.id),
      rotation: Math.PI / 2,
    });
    expect(target1.hitTest({ x: 5, y: 4 }, 1)).toEqual({
      type: "rotation",
      info: [a.id, a.rotation, { x: 5, y: 5 }],
    });
    expect(target1.hitTest({ x: 5, y: 14 }, 1)).toBe(undefined);
    expect(target1.hitTest({ x: 5, y: 24 }, 1)).toBe(undefined);
    expect(target1.hitTest({ x: 5, y: 34 }, 1)).toEqual({
      type: "rotation",
      info: [d.id, d.rotation, { x: 5, y: 35 }],
    });
  });

  test("should not check line shapes", () => {
    const a = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "a",
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      rotation: Math.PI / 2,
    });
    const line = createShape<LineShape>(getCommonStruct, "line", {
      id: "b",
      p: { x: 0, y: 20 },
      q: { x: 10, y: 20 },
    });
    const shapes = [a, line];
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes,
    });

    const target0 = newMultipleSelectedHandler({
      getShapeComposite: () => shapeComposite,
      targetIds: shapes.map((s) => s.id),
      rotation: Math.PI / 4,
    });
    expect(target0.hitTest({ x: 5, y: 20 }, 1)).toBe(undefined);
    expect(target0.hitTest({ x: 5, y: 5 }, 1)?.info[0]).toBe("a");
  });
});
