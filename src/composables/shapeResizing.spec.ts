import { describe, expect, test } from "vitest";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { multiAffines } from "okageo";
import { GroupShape } from "../shapes/group";
import { resizeShapeTrees } from "./shapeResizing";

describe("resizeShapeTrees", () => {
  const group0 = createShape(getCommonStruct, "group", { id: "group0" });
  const frame = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "frame",
    parentId: group0.id,
    p: { x: 0, y: 0 },
    width: 20,
    height: 20,
  });
  const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
    id: "child0",
    parentId: group0.id,
    p: { x: 5, y: 5 },
    width: 10,
    height: 10,
  });

  test("should regard group constraints: 0", () => {
    const shapes = [group0, frame, child0];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine = multiAffines([
      [1, 0, 0, 1, 0, 20],
      [1, 0, 0, 0.5, 0, 0],
      [1, 0, 0, 1, 0, -20],
    ]);
    const res0 = resizeShapeTrees(target, [group0.id], affine);

    expect(res0[child0.id]).toEqual({
      p: { x: 5, y: 12.5 },
      height: 5,
    });
  });

  test("should regard group constraints: 1", () => {
    const child1: RectangleShape = { ...child0, gcV: 1 };
    const shapes = [group0, frame, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine = multiAffines([
      [1, 0, 0, 1, 0, 20],
      [1, 0, 0, 0.5, 0, 0],
      [1, 0, 0, 1, 0, -20],
    ]);
    const res0 = resizeShapeTrees(target, [group0.id], affine);
    const polygon0 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon0[0].x).toBeCloseTo(5);
    expect(polygon0[0].y).toBeCloseTo(15);
    expect(polygon0[1].x).toBeCloseTo(15);
    expect(polygon0[1].y).toBeCloseTo(15);
    expect(polygon0[2].x).toBeCloseTo(15);
    expect(polygon0[2].y).toBeCloseTo(17.5);
    expect(polygon0[3].x).toBeCloseTo(5);
    expect(polygon0[3].y).toBeCloseTo(17.5);
    expect(res0[child1.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 1, rotated", () => {
    const group1: GroupShape = { ...group0, rotation: Math.PI / 2 };
    const child1: RectangleShape = { ...child0, gcV: 1, rotation: Math.PI / 2 };
    const shapes = [group1, frame, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([
      [1, 0, 0, 1, 0, 20],
      [1, 0, 0, 0.5, 0, 0],
      [1, 0, 0, 1, 0, -20],
    ]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    const polygon0 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon0[0].x).toBeCloseTo(15);
    expect(polygon0[0].y).toBeCloseTo(12.5);
    expect(polygon0[1].x).toBeCloseTo(15);
    expect(polygon0[1].y).toBeCloseTo(17.5);
    expect(polygon0[2].x).toBeCloseTo(5);
    expect(polygon0[2].y).toBeCloseTo(17.5);
    expect(polygon0[3].x).toBeCloseTo(5);
    expect(polygon0[3].y).toBeCloseTo(12.5);
    expect(res0[child1.id].rotation).toBe(undefined);

    const affine1 = multiAffines([
      [1, 0, 0, 1, 20, 0],
      [0.5, 0, 0, 1, 0, 0],
      [1, 0, 0, 1, -20, 0],
    ]);
    const res1 = resizeShapeTrees(target, [group0.id], affine1) as any;
    const polygon1 = target.getLocalRectPolygon({ ...child1, ...res1[child1.id] });
    expect(polygon1[0].x).toBeCloseTo(15);
    expect(polygon1[0].y).toBeCloseTo(5);
    expect(polygon1[1].x).toBeCloseTo(15);
    expect(polygon1[1].y).toBeCloseTo(15);
    expect(polygon1[2].x).toBeCloseTo(12.5);
    expect(polygon1[2].y).toBeCloseTo(15);
    expect(polygon1[3].x).toBeCloseTo(12.5);
    expect(polygon1[3].y).toBeCloseTo(5);
    expect(res1[child1.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 1, deep nest", () => {
    const group1: GroupShape = { ...group0, id: "group1", parentId: group0.id, rotation: Math.PI / 2 };
    const group2: GroupShape = { ...group1, id: "group2", parentId: group1.id, rotation: Math.PI };
    const child1: RectangleShape = { ...child0, parentId: group2.id, gcV: 1, rotation: Math.PI };
    const frame1: RectangleShape = { ...frame, parentId: group2.id };
    const shapes = [group0, group1, group2, frame1, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 0.5, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    const polygon0 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon0[0].x).toBeCloseTo(15);
    expect(polygon0[0].y).toBeCloseTo(5);
    expect(polygon0[1].x).toBeCloseTo(5);
    expect(polygon0[1].y).toBeCloseTo(5);
    expect(polygon0[2].x).toBeCloseTo(5);
    expect(polygon0[2].y).toBeCloseTo(2.5);
    expect(polygon0[3].x).toBeCloseTo(15);
    expect(polygon0[3].y).toBeCloseTo(2.5);
    expect(res0[child1.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 1, deep nested constraints", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 4,
    });
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 1 });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group1.id,
      p: { x: 0, y: 10 },
      width: 10,
      height: 10,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: group1.id,
      p: { x: 0, y: 20 },
      width: 10,
      height: 10,
      gcV: 1,
    });

    const shapes = [group0, child0, group1, child1, child2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    expect({ ...child1, ...res0[child1.id] }).toEqual({ ...child1, p: { x: 0, y: 10 }, height: 25 });
    expect({ ...child2, ...res0[child2.id] }).toEqual({ ...child2, p: { x: 0, y: 20 }, height: 40 });
  });

  test("should regard group constraints: 1, child within non-group should inherit parent resizing", () => {
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 10, y: 10 },
      width: 10,
      height: 10,
      gcV: 1,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: child0.id,
      p: { x: 10, y: 10 },
      width: 10,
      height: 10,
    });
    const shapes = [group0, frame, child0, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    const polygon1 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon1[0].x).toBeCloseTo(10);
    expect(polygon1[0].y).toBeCloseTo(10);
    expect(polygon1[1].x).toBeCloseTo(20);
    expect(polygon1[1].y).toBeCloseTo(10);
    expect(polygon1[2].x).toBeCloseTo(20);
    expect(polygon1[2].y).toBeCloseTo(40);
    expect(polygon1[3].x).toBeCloseTo(10);
    expect(polygon1[3].y).toBeCloseTo(40);
    expect(res0[child1.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 2, rotated", () => {
    const group1: GroupShape = { ...group0, rotation: Math.PI / 2 };
    const child1: RectangleShape = { ...child0, gcV: 2, rotation: Math.PI / 2 };
    const shapes = [group1, frame, child1];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([
      [1, 0, 0, 1, 0, 20],
      [1, 0, 0, 0.5, 0, 0],
      [1, 0, 0, 1, 0, -20],
    ]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    const polygon0 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon0[0].x).toBeCloseTo(15);
    expect(polygon0[0].y).toBeCloseTo(12.5);
    expect(polygon0[1].x).toBeCloseTo(15);
    expect(polygon0[1].y).toBeCloseTo(17.5);
    expect(polygon0[2].x).toBeCloseTo(5);
    expect(polygon0[2].y).toBeCloseTo(17.5);
    expect(polygon0[3].x).toBeCloseTo(5);
    expect(polygon0[3].y).toBeCloseTo(12.5);
    expect(res0[child1.id].rotation).toBe(undefined);

    const affine1 = multiAffines([
      [1, 0, 0, 1, 20, 0],
      [2, 0, 0, 1, 0, 0],
      [1, 0, 0, 1, -20, 0],
    ]);
    const res1 = resizeShapeTrees(target, [group0.id], affine1) as any;
    const polygon1 = target.getLocalRectPolygon({ ...child1, ...res1[child1.id] });
    expect(polygon1[0].x).toBeCloseTo(5);
    expect(polygon1[0].y).toBeCloseTo(5);
    expect(polygon1[1].x).toBeCloseTo(5);
    expect(polygon1[1].y).toBeCloseTo(15);
    expect(polygon1[2].x).toBeCloseTo(-5);
    expect(polygon1[2].y).toBeCloseTo(15);
    expect(polygon1[3].x).toBeCloseTo(-5);
    expect(polygon1[3].y).toBeCloseTo(5);
    expect(res1[child1.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 2, deep nested constraints", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 4,
    });
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 2 });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group1.id,
      p: { x: 0, y: 10 },
      width: 10,
      height: 10,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: group1.id,
      p: { x: 0, y: 20 },
      width: 10,
      height: 10,
      gcV: 2,
    });

    const shapes = [group0, child0, group1, child1, child2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    expect({ ...child1, ...res0[child1.id] }).toEqual({ ...child1, p: { x: 0, y: 30 }, height: 10 });
    expect({ ...child2, ...res0[child2.id] }).toEqual({ ...child2, p: { x: 0, y: 40 }, height: 10 });
  });

  test("should regard group constraints: 3, deep nested constraints", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 4,
    });
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 3 });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group1.id,
      p: { x: 0, y: 10 },
      width: 10,
      height: 10,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: group1.id,
      p: { x: 0, y: 20 },
      width: 10,
      height: 10,
      gcV: 3,
    });

    const shapes = [group0, child0, group1, child1, child2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    expect({ ...child1, ...res0[child1.id] }).toEqual({ ...child1, p: { x: 0, y: 20 }, height: 20 });
    expect({ ...child2, ...res0[child2.id] }).toEqual({ ...child2, p: { x: 0, y: 40 }, height: 20 });
  });

  test("should regard group constraints: 4, deep nested constraints", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 4,
    });
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 4 });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group1.id,
      p: { x: 0, y: 10 },
      width: 10,
      height: 10,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: group1.id,
      p: { x: 0, y: 20 },
      width: 10,
      height: 10,
      gcV: 4,
    });

    const shapes = [group0, child0, group1, child1, child2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    expect({ ...child1, ...res0[child1.id] }).toEqual({ ...child1, p: { x: 0, y: 10 }, height: 10 });
    expect({ ...child2, ...res0[child2.id] }).toEqual({ ...child2, p: { x: 0, y: 20 }, height: 10 });
  });

  test("should regard group constraints: 5, deep nested constraints", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 4,
    });
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 5 });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group1.id,
      p: { x: 0, y: 10 },
      width: 10,
      height: 10,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: group1.id,
      p: { x: 0, y: 20 },
      width: 10,
      height: 10,
      gcV: 5,
    });

    const shapes = [group0, child0, group1, child1, child2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    expect({ ...child1, ...res0[child1.id] }).toEqual({ ...child1, p: { x: 0, y: 10 }, height: 25 });
    expect({ ...child2, ...res0[child2.id] }).toEqual({ ...child2, p: { x: 0, y: 20 }, height: 40 });
  });

  test("should regard group constraints: 6, deep nested constraints", () => {
    const group0 = createShape(getCommonStruct, "group", { id: "group0" });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group0.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 4,
    });
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 6 });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group1.id,
      p: { x: 0, y: 10 },
      width: 10,
      height: 10,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: group1.id,
      p: { x: 0, y: 20 },
      width: 10,
      height: 10,
      gcV: 6,
    });

    const shapes = [group0, child0, group1, child1, child2];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    expect({ ...child1, ...res0[child1.id] }).toEqual({ ...child1, p: { x: 0, y: 40 }, height: 10 });
    expect({ ...child2, ...res0[child2.id] }).toEqual({ ...child2, p: { x: 0, y: 50 }, height: 10 });
  });
});
