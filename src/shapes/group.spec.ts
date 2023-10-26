import { expect, describe, test } from "vitest";
import { struct } from "./group";
import { struct as rectangleStruct } from "./rectangle";
import { newShapeComposite } from "../composables/shapeComposite";
import { getCommonStruct } from ".";

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
      ).toEqual({ x: 1, y: 2 });
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
