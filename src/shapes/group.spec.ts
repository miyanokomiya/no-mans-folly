import { expect, describe, test } from "vitest";
import { struct } from "./group";
import { struct as rectangleStruct } from "./rectangle";
import { newShapeComposite } from "../composables/shapeComposite";
import { getCommonStruct } from ".";
import { getRotationAffine } from "../utils/geometry";

describe("struct", () => {
  describe("create", () => {
    test("should return new shape", () => {
      const result = struct.create();
      expect(result.type).toBe("group");
    });
  });

  describe("getWrapperRect", () => {
    test("should return the wrapper rectangle derived from children", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getWrapperRect(group),
      ).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    });

    test("empty fallback: should return empty rectangle when there's no child", () => {
      const group = struct.create({ id: "group" });
      expect(
        newShapeComposite({
          shapes: [group],
          getStruct: getCommonStruct,
        }).getWrapperRect(group),
      ).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    test("should exclude children with noBounds when there are multiple children", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 10, y: 20 },
        width: 30,
        height: 40,
        noBounds: true, // This should be excluded
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getWrapperRect(group),
      ).toEqual({ x: 1, y: 2, width: 3, height: 4 }); // Only child0's bounds
    });

    test("should include single child with noBounds", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 5, y: 10 },
        width: 15,
        height: 20,
        noBounds: true, // Should still be included when it's the only child
      });
      expect(
        newShapeComposite({
          shapes: [group, child0],
          getStruct: getCommonStruct,
        }).getWrapperRect(group),
      ).toEqual({ x: 5, y: 10, width: 15, height: 20 });
    });

    test("should fallback to all children when all have noBounds", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
        noBounds: true,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
        noBounds: true,
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getWrapperRect(group),
      ).toEqual({ x: 1, y: 2, width: 3, height: 4 }); // Uses all children as fallback
    });
  });

  describe("getLocalRectPolygon", () => {
    test("should return the local rectangle derived from children", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 10, y: 20 },
        width: 3,
        height: 4,
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getLocalRectPolygon(group),
      ).toEqual([
        { x: 1, y: 2 },
        { x: 13, y: 2 },
        { x: 13, y: 24 },
        { x: 1, y: 24 },
      ]);
    });

    test("should return the local rectangle derived from children: rotated", () => {
      const group = struct.create({ id: "group", rotation: Math.PI / 2 });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 0, y: 0 },
        width: 10,
        height: 10,
        rotation: Math.PI / 2,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 10, y: 0 },
        width: 20,
        height: 10,
        rotation: Math.PI / 2,
      });

      const res = newShapeComposite({
        shapes: [group, child0, child1],
        getStruct: getCommonStruct,
      }).getLocalRectPolygon(group);
      expect(res[0].x).toBeCloseTo(25);
      expect(res[0].y).toBeCloseTo(-5);
      expect(res[1].x).toBeCloseTo(25);
      expect(res[1].y).toBeCloseTo(15);
      expect(res[2].x).toBeCloseTo(0);
      expect(res[2].y).toBeCloseTo(15);
      expect(res[3].x).toBeCloseTo(0);
      expect(res[3].y).toBeCloseTo(-5);
    });

    test("should return the local rectangle derived from children: rotated 2", () => {
      const group = struct.create({ id: "group", rotation: Math.PI / 2 });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 0, y: 10 },
        width: 10,
        height: 10,
        rotation: Math.PI / 2,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 10, y: 0 },
        width: 10,
        height: 10,
        rotation: Math.PI / 2,
      });

      const res = newShapeComposite({
        shapes: [group, child0, child1],
        getStruct: getCommonStruct,
      }).getLocalRectPolygon(group);
      expect(res[0].x).toBeCloseTo(20);
      expect(res[0].y).toBeCloseTo(0);
      expect(res[1].x).toBeCloseTo(20);
      expect(res[1].y).toBeCloseTo(20);
      expect(res[2].x).toBeCloseTo(0);
      expect(res[2].y).toBeCloseTo(20);
      expect(res[3].x).toBeCloseTo(0);
      expect(res[3].y).toBeCloseTo(0);
    });

    test("empty fallback: should return empty rectangle when there's no child", () => {
      const group = struct.create({ id: "group" });
      expect(
        newShapeComposite({
          shapes: [group],
          getStruct: getCommonStruct,
        }).getLocalRectPolygon(group),
      ).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]);
    });

    test("should exclude children with noBounds when there are multiple children", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 100, y: 200 },
        width: 30,
        height: 40,
        noBounds: true, // This should be excluded
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getLocalRectPolygon(group),
      ).toEqual([
        { x: 1, y: 2 },
        { x: 4, y: 2 },
        { x: 4, y: 6 },
        { x: 1, y: 6 },
      ]); // Only child0's bounds
    });

    test("should include single child with noBounds", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 5, y: 10 },
        width: 15,
        height: 20,
        noBounds: true, // Should still be included when it's the only child
      });
      expect(
        newShapeComposite({
          shapes: [group, child0],
          getStruct: getCommonStruct,
        }).getLocalRectPolygon(group),
      ).toEqual([
        { x: 5, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 30 },
        { x: 5, y: 30 },
      ]);
    });

    test("should fallback to all children when all have noBounds", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
        noBounds: true,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 10, y: 20 },
        width: 3,
        height: 4,
        noBounds: true,
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getLocalRectPolygon(group),
      ).toEqual([
        { x: 1, y: 2 },
        { x: 13, y: 2 },
        { x: 13, y: 24 },
        { x: 1, y: 24 },
      ]); // Uses all children as fallbac2
    });
  });

  describe("isPointOn", () => {
    test("should return true if the point is on the shape", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 10,
        height: 10,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 10, y: 20 },
        width: 10,
        height: 10,
      });
      const shapeComposite = newShapeComposite({
        shapes: [group, child0, child1],
        getStruct: getCommonStruct,
      });
      expect(shapeComposite.findShapeAt({ x: 5, y: 5 })).toEqual(group);
      expect(shapeComposite.findShapeAt({ x: -5, y: 5 })).toEqual(undefined);
    });

    test("empty fallback: should return false when there's no child", () => {
      const group = struct.create({ id: "group" });
      const shapeComposite = newShapeComposite({
        shapes: [group],
        getStruct: getCommonStruct,
      });
      expect(shapeComposite.findShapeAt({ x: 0, y: 0 })).toEqual(undefined);
      expect(shapeComposite.findShapeAt({ x: -0, y: -0 })).toEqual(undefined);
    });
  });

  describe("resize", () => {
    test("should patch rotation", () => {
      const group = struct.create({ id: "group", rotation: Math.PI / 2 });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 0, y: 0 },
        width: 10,
        height: 10,
        rotation: Math.PI / 2,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 10, y: 0 },
        width: 20,
        height: 10,
        rotation: Math.PI / 2,
      });

      const res = newShapeComposite({
        shapes: [group, child0, child1],
        getStruct: getCommonStruct,
      }).transformShape(group, getRotationAffine(Math.PI / 2));
      expect(res.rotation).toBeCloseTo(Math.PI);
    });
  });

  describe("getActualPosition", () => {
    test("should return top left of the wrapper rectangle derived from children", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getShapeActualPosition(group),
      ).toEqualPoint({ x: 1, y: 2 });
    });

    test("should regard rotation", () => {
      const group = struct.create({ id: "group", rotation: Math.PI / 4 });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
        rotation: Math.PI / 4,
      });
      const child1 = rectangleStruct.create({
        id: "child1",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
        rotation: Math.PI / 4,
      });
      expect(
        newShapeComposite({
          shapes: [group, child0, child1],
          getStruct: getCommonStruct,
        }).getShapeActualPosition(group),
      ).toEqualPoint({ x: 1, y: 2 });
    });
  });

  describe("shouldDelete", () => {
    test("should return true when there's no children", () => {
      const group = struct.create({ id: "group" });
      const child0 = rectangleStruct.create({
        id: "child0",
        parentId: group.id,
        p: { x: 1, y: 2 },
        width: 3,
        height: 4,
      });
      expect(
        newShapeComposite({
          shapes: [group, child0],
          getStruct: getCommonStruct,
        }).shouldDelete(group),
      ).toBe(false);
      expect(
        newShapeComposite({
          shapes: [group],
          getStruct: getCommonStruct,
        }).shouldDelete(group),
      ).toBe(true);
    });
  });
});
