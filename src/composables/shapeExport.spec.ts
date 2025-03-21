import { describe, test, expect } from "vitest";
import { getExportParamsForSelectedRange, getExportParamsForSelectedShapes } from "./shapeExport";
import { newShapeComposite } from "./shapeComposite";
import { createShape, getCommonStruct } from "../shapes";
import { RectangleShape } from "../shapes/rectangle";
import { createStrokeStyle } from "../utils/strokeStyle";

describe("getExportParamsForSelectedShapes", () => {
  test("should exclude shapes with noExport property", () => {
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [
        createShape(getCommonStruct, "rectangle", { id: "shape1" }),
        createShape(getCommonStruct, "group", { id: "shape2", noExport: true }),
        createShape(getCommonStruct, "rectangle", { id: "shape3" }),
        createShape(getCommonStruct, "rectangle", { id: "shape4", parentId: "shape2" }),
      ],
    });

    const { targetShapeComposite } = getExportParamsForSelectedShapes(
      shapeComposite,
      shapeComposite.shapes.map((s) => s.id),
    );
    expect(targetShapeComposite.shapeMap).toHaveProperty("shape1");
    expect(targetShapeComposite.shapeMap).not.toHaveProperty("shape2");
    expect(targetShapeComposite.shapeMap).toHaveProperty("shape3");
    expect(
      targetShapeComposite.shapeMap,
      "all children in no-export parents should be ignored regardless of their own property",
    ).not.toHaveProperty("shape4");

    // When withMeta is true, ignore noExport property.
    const { targetShapeComposite: targetShapeComposite2 } = getExportParamsForSelectedShapes(
      shapeComposite,
      shapeComposite.shapes.map((s) => s.id),
      true,
    );
    expect(targetShapeComposite2.shapeMap).toHaveProperty("shape2");
    expect(targetShapeComposite2.shapeMap).toHaveProperty("shape4");
  });

  test("should exclude shapes with noExport property for calculating the target area", () => {
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [
        createShape<RectangleShape>(getCommonStruct, "rectangle", {
          id: "shape1",
          p: { x: 0, y: 0 },
          width: 10,
          height: 10,
          stroke: createStrokeStyle({ disabled: true }),
        }),
        createShape<RectangleShape>(getCommonStruct, "rectangle", {
          id: "shape2",
          p: { x: 10, y: 10 },
          width: 10,
          height: 10,
          noExport: true,
          stroke: createStrokeStyle({ disabled: true }),
        }),
      ],
    });

    const { range } = getExportParamsForSelectedShapes(
      shapeComposite,
      shapeComposite.shapes.map((s) => s.id),
    );
    expect(range).toEqualRect({ x: 0, y: 0, width: 10, height: 10 });
  });
});

describe("getExportParamsForSelectedRange", () => {
  test("should exclude shapes with noExport property", () => {
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [
        createShape(getCommonStruct, "rectangle", { id: "shape1" }),
        createShape(getCommonStruct, "group", { id: "shape2", noExport: true }),
        createShape(getCommonStruct, "rectangle", { id: "shape3" }),
        createShape(getCommonStruct, "rectangle", { id: "shape4", parentId: "shape2" }),
      ],
    });

    const { targetShapeComposite } = getExportParamsForSelectedRange(
      shapeComposite,
      shapeComposite.shapes.map((s) => s.id),
    );
    expect(targetShapeComposite.shapeMap).toHaveProperty("shape1");
    expect(targetShapeComposite.shapeMap).not.toHaveProperty("shape2");
    expect(targetShapeComposite.shapeMap).toHaveProperty("shape3");
    expect(
      targetShapeComposite.shapeMap,
      "all children in no-export parents should be ignored regardless of their own property",
    ).not.toHaveProperty("shape4");

    // When withMeta is true, ignore noExport property.
    const { targetShapeComposite: targetShapeComposite2 } = getExportParamsForSelectedRange(
      shapeComposite,
      shapeComposite.shapes.map((s) => s.id),
      undefined,
      true,
    );
    expect(targetShapeComposite2.shapeMap).toHaveProperty("shape2");
    expect(targetShapeComposite2.shapeMap).toHaveProperty("shape4");
  });

  test("should not exclude shapes with noExport property for calculating the target area", () => {
    const shapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [
        createShape<RectangleShape>(getCommonStruct, "rectangle", {
          id: "shape1",
          p: { x: 0, y: 0 },
          width: 10,
          height: 10,
          stroke: createStrokeStyle({ disabled: true }),
        }),
        createShape<RectangleShape>(getCommonStruct, "rectangle", {
          id: "shape2",
          p: { x: 10, y: 10 },
          width: 10,
          height: 10,
          noExport: true,
          stroke: createStrokeStyle({ disabled: true }),
        }),
      ],
    });

    const { range } = getExportParamsForSelectedRange(
      shapeComposite,
      shapeComposite.shapes.map((s) => s.id),
    );
    expect(range).toEqualRect({ x: 0, y: 0, width: 20, height: 20 });
  });
});
