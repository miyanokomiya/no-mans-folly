import { describe, test, expect } from "vitest";
import { getAnyConnectedLineInfoAtNode, getConnectedLineInfoListAtNode } from "./vectorNetwork";
import { newShapeComposite, ShapeComposite } from "./shapeComposite";
import { LineShape } from "../shapes/line";
import { createShape, getCommonStruct } from "../shapes";
import { VnNodeShape } from "../shapes/vectorNetworks/vnNode";

describe("getConnectedLineInfoListAtNode", () => {
  test("should return connected line info list at a given node", () => {
    const shapeComposite: ShapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [
        createShape<VnNodeShape>(getCommonStruct, "vn_node", {
          id: "node1",
        }),
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line1",
          pConnection: { id: "node1", rate: { x: 0.5, y: 0.5 } },
        }),
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line2",
          qConnection: { id: "node1", rate: { x: 0.5, y: 0.5 } },
        }),
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line3",
        }),
      ],
    });

    const result = getConnectedLineInfoListAtNode(shapeComposite, "node1");
    expect(result).toEqual([
      ["line1", 0],
      ["line2", 1],
    ]);
  });
});

describe("getAnyConnectedLineInfoAtNode", () => {
  test("should return connected line info at a given node", () => {
    const shapeComposite: ShapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [
        createShape<VnNodeShape>(getCommonStruct, "vn_node", {
          id: "node1",
        }),
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line1",
          pConnection: { id: "node1", rate: { x: 0.5, y: 0.5 } },
        }),
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line2",
          qConnection: { id: "node1", rate: { x: 0.5, y: 0.5 } },
        }),
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line3",
        }),
      ],
    });

    expect(getAnyConnectedLineInfoAtNode(shapeComposite, "node1")).toEqual(["line2", 1]);
    expect(getAnyConnectedLineInfoAtNode(shapeComposite, "node2")).toBe(undefined);
  });
});
