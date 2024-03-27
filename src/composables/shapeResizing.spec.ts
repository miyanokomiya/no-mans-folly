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
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 1 });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group1.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 1,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child1",
      parentId: group1.id,
      p: { x: 10, y: 10 },
      width: 10,
      height: 10,
      gcV: 1,
    });
    const group2 = createShape(getCommonStruct, "group", {
      id: "group2",
      parentId: group0.id,
      gcV: 1,
      rotation: Math.PI / 2,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child2",
      parentId: group2.id,
      p: { x: 20, y: 20 },
      width: 10,
      height: 10,
      gcV: 1,
      rotation: Math.PI / 2,
    });
    const child3 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child3",
      parentId: group2.id,
      p: { x: 30, y: 30 },
      width: 10,
      height: 10,
      gcV: 1,
      rotation: Math.PI / 2,
    });
    const shapes = [group0, group1, child0, child1, group2, child2, child3];
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

    const polygon3 = target.getLocalRectPolygon({ ...child3, ...res0[child3.id] });
    expect(polygon3[0].x).toBeCloseTo(40);
    expect(polygon3[0].y).toBeCloseTo(60);
    expect(polygon3[1].x).toBeCloseTo(40);
    expect(polygon3[1].y).toBeCloseTo(80);
    expect(polygon3[2].x).toBeCloseTo(30);
    expect(polygon3[2].y).toBeCloseTo(80);
    expect(polygon3[3].x).toBeCloseTo(30);
    expect(polygon3[3].y).toBeCloseTo(60);
    expect(res0[child3.id].rotation).toBe(undefined);
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

  test("should regard group constraints: 2, deep nested constraints", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 2 });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group1.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 2,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child1",
      p: { x: 10, y: 10 },
    });
    const group2 = createShape(getCommonStruct, "group", {
      ...group1,
      id: "group2",
      rotation: Math.PI / 2,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child2",
      parentId: group2.id,
      p: { x: 20, y: 20 },
      rotation: Math.PI / 2,
    });
    const child3 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child3",
      parentId: group2.id,
      p: { x: 30, y: 30 },
      rotation: Math.PI / 2,
    });
    const shapes = [group0, group1, child0, child1, group2, child2, child3];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    const polygon1 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon1[0].x).toBeCloseTo(10);
    expect(polygon1[0].y).toBeCloseTo(25);
    expect(polygon1[1].x).toBeCloseTo(20);
    expect(polygon1[1].y).toBeCloseTo(25);
    expect(polygon1[2].x).toBeCloseTo(20);
    expect(polygon1[2].y).toBeCloseTo(35);
    expect(polygon1[3].x).toBeCloseTo(10);
    expect(polygon1[3].y).toBeCloseTo(35);
    expect(res0[child1.id].rotation).toBe(undefined);

    const polygon3 = target.getLocalRectPolygon({ ...child3, ...res0[child3.id] });
    expect(polygon3[0].x).toBeCloseTo(40);
    expect(polygon3[0].y).toBeCloseTo(60);
    expect(polygon3[1].x).toBeCloseTo(40);
    expect(polygon3[1].y).toBeCloseTo(80);
    expect(polygon3[2].x).toBeCloseTo(30);
    expect(polygon3[2].y).toBeCloseTo(80);
    expect(polygon3[3].x).toBeCloseTo(30);
    expect(polygon3[3].y).toBeCloseTo(60);
    expect(res0[child3.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 3, deep nested constraints", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 3 });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group1.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 3,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child1",
      p: { x: 10, y: 10 },
    });
    const group2 = createShape(getCommonStruct, "group", {
      ...group1,
      id: "group2",
      rotation: Math.PI / 2,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child2",
      parentId: group2.id,
      p: { x: 20, y: 20 },
      rotation: Math.PI / 2,
    });
    const child3 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child3",
      parentId: group2.id,
      p: { x: 30, y: 30 },
      rotation: Math.PI / 2,
    });
    const shapes = [group0, group1, child0, child1, group2, child2, child3];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    const polygon1 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon1[0].x).toBeCloseTo(10);
    expect(polygon1[0].y).toBeCloseTo(20);
    expect(polygon1[1].x).toBeCloseTo(20);
    expect(polygon1[1].y).toBeCloseTo(20);
    expect(polygon1[2].x).toBeCloseTo(20);
    expect(polygon1[2].y).toBeCloseTo(60);
    expect(polygon1[3].x).toBeCloseTo(10);
    expect(polygon1[3].y).toBeCloseTo(60);
    expect(res0[child1.id].rotation).toBe(undefined);

    const polygon3 = target.getLocalRectPolygon({ ...child3, ...res0[child3.id] });
    expect(polygon3[0].x).toBeCloseTo(40);
    expect(polygon3[0].y).toBeCloseTo(60);
    expect(polygon3[1].x).toBeCloseTo(40);
    expect(polygon3[1].y).toBeCloseTo(80);
    expect(polygon3[2].x).toBeCloseTo(30);
    expect(polygon3[2].y).toBeCloseTo(80);
    expect(polygon3[3].x).toBeCloseTo(30);
    expect(polygon3[3].y).toBeCloseTo(60);
    expect(res0[child3.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 4, deep nested constraints", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 4 });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group1.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 4,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child1",
      p: { x: 10, y: 10 },
    });
    const group2 = createShape(getCommonStruct, "group", {
      ...group1,
      id: "group2",
      rotation: Math.PI / 2,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child2",
      parentId: group2.id,
      p: { x: 20, y: 20 },
      rotation: Math.PI / 2,
    });
    const child3 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child3",
      parentId: group2.id,
      p: { x: 30, y: 30 },
      rotation: Math.PI / 2,
    });
    const shapes = [group0, group1, child0, child1, group2, child2, child3];
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
    expect(polygon1[2].y).toBeCloseTo(20);
    expect(polygon1[3].x).toBeCloseTo(10);
    expect(polygon1[3].y).toBeCloseTo(20);
    expect(res0[child1.id].rotation).toBe(undefined);

    const polygon3 = target.getLocalRectPolygon({ ...child3, ...res0[child3.id] });
    expect(polygon3[0].x).toBeCloseTo(40);
    expect(polygon3[0].y).toBeCloseTo(60);
    expect(polygon3[1].x).toBeCloseTo(40);
    expect(polygon3[1].y).toBeCloseTo(80);
    expect(polygon3[2].x).toBeCloseTo(30);
    expect(polygon3[2].y).toBeCloseTo(80);
    expect(polygon3[3].x).toBeCloseTo(30);
    expect(polygon3[3].y).toBeCloseTo(60);
    expect(res0[child3.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 5, deep nested constraints", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 5 });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group1.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 5,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child1",
      p: { x: 10, y: 10 },
    });
    const group2 = createShape(getCommonStruct, "group", {
      ...group1,
      id: "group2",
      rotation: Math.PI / 2,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child2",
      parentId: group2.id,
      p: { x: 20, y: 20 },
      rotation: Math.PI / 2,
    });
    const child3 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child3",
      parentId: group2.id,
      p: { x: 30, y: 30 },
      rotation: Math.PI / 2,
    });
    const shapes = [group0, group1, child0, child1, group2, child2, child3];
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
    expect(polygon1[2].y).toBeCloseTo(60);
    expect(polygon1[3].x).toBeCloseTo(10);
    expect(polygon1[3].y).toBeCloseTo(60);
    expect(res0[child1.id].rotation).toBe(undefined);

    const polygon3 = target.getLocalRectPolygon({ ...child3, ...res0[child3.id] });
    expect(polygon3[0].x).toBeCloseTo(40);
    expect(polygon3[0].y).toBeCloseTo(60);
    expect(polygon3[1].x).toBeCloseTo(40);
    expect(polygon3[1].y).toBeCloseTo(80);
    expect(polygon3[2].x).toBeCloseTo(30);
    expect(polygon3[2].y).toBeCloseTo(80);
    expect(polygon3[3].x).toBeCloseTo(30);
    expect(polygon3[3].y).toBeCloseTo(60);
    expect(res0[child3.id].rotation).toBe(undefined);
  });

  test("should regard group constraints: 6, deep nested constraints", () => {
    const group1 = createShape(getCommonStruct, "group", { id: "group1", parentId: group0.id, gcV: 6 });
    const child0 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      id: "child0",
      parentId: group1.id,
      p: { x: 0, y: 0 },
      width: 10,
      height: 10,
      gcV: 6,
    });
    const child1 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child1",
      p: { x: 10, y: 10 },
    });
    const group2 = createShape(getCommonStruct, "group", {
      ...group1,
      id: "group2",
      rotation: Math.PI / 2,
    });
    const child2 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child2",
      parentId: group2.id,
      p: { x: 20, y: 20 },
      rotation: Math.PI / 2,
    });
    const child3 = createShape<RectangleShape>(getCommonStruct, "rectangle", {
      ...child0,
      id: "child3",
      parentId: group2.id,
      p: { x: 30, y: 30 },
      rotation: Math.PI / 2,
    });
    const shapes = [group0, group1, child0, child1, group2, child2, child3];
    const target = newShapeComposite({
      shapes,
      getStruct: getCommonStruct,
    });

    const affine0 = multiAffines([[1, 0, 0, 2, 0, 0]]);
    const res0 = resizeShapeTrees(target, [group0.id], affine0) as any;
    const polygon1 = target.getLocalRectPolygon({ ...child1, ...res0[child1.id] });
    expect(polygon1[0].x).toBeCloseTo(10);
    expect(polygon1[0].y).toBeCloseTo(50);
    expect(polygon1[1].x).toBeCloseTo(20);
    expect(polygon1[1].y).toBeCloseTo(50);
    expect(polygon1[2].x).toBeCloseTo(20);
    expect(polygon1[2].y).toBeCloseTo(60);
    expect(polygon1[3].x).toBeCloseTo(10);
    expect(polygon1[3].y).toBeCloseTo(60);
    expect(res0[child1.id].rotation).toBe(undefined);

    const polygon3 = target.getLocalRectPolygon({ ...child3, ...res0[child3.id] });
    expect(polygon3[0].x).toBeCloseTo(40);
    expect(polygon3[0].y).toBeCloseTo(60);
    expect(polygon3[1].x).toBeCloseTo(40);
    expect(polygon3[1].y).toBeCloseTo(80);
    expect(polygon3[2].x).toBeCloseTo(30);
    expect(polygon3[2].y).toBeCloseTo(80);
    expect(polygon3[3].x).toBeCloseTo(30);
    expect(polygon3[3].y).toBeCloseTo(60);
    expect(res0[child3.id].rotation).toBe(undefined);
  });
});
