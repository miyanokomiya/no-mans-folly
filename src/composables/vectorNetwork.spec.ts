import { describe, test, expect } from "vitest";
import {
  getAnyConnectedLineInfoAtNode,
  getConnectedLineInfoListAtNode,
  seekNearbyVnNode,
  patchBySplitAttachingLine,
  getInheritableVnNodeProperties,
} from "./vectorNetwork";
import { newShapeComposite, ShapeComposite } from "./shapeComposite";
import { LineShape } from "../shapes/line";
import { createShape, getCommonStruct } from "../shapes";
import { VnNodeShape } from "../shapes/vectorNetworks/vnNode";
import { TextShape } from "../shapes/text";
import { createFillStyle } from "../utils/fillStyle";
import { COLORS } from "../utils/color";
import { createStrokeStyle } from "../utils/strokeStyle";

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

describe("seekNearbyVnNode", () => {
  test("should seek a VN node shape that is near by the given source shapes", () => {
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

    expect(seekNearbyVnNode(shapeComposite, ["line1"])?.id).toBe("node1");
    expect(seekNearbyVnNode(shapeComposite, ["line2"])?.id).toBe("node1");
    expect(seekNearbyVnNode(shapeComposite, ["line3"])?.id).toBe(undefined);
  });
});

describe("patchBySplitAttachingLine", () => {
  test("should return shape patch to reattach shapes to split lines", () => {
    const shapeComposite: ShapeComposite = newShapeComposite({
      getStruct: getCommonStruct,
      shapes: [
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line1",
        }),
        createShape<LineShape>(getCommonStruct, "line", {
          id: "line2",
        }),
        createShape<TextShape>(getCommonStruct, "text", {
          id: "text1",
          parentId: "line1",
          lineAttached: 0.3,
        }),
        createShape<TextShape>(getCommonStruct, "text", {
          id: "text2",
          parentId: "line1",
          lineAttached: 0.7,
        }),
        createShape(getCommonStruct, "text", {
          id: "text3",
          attachment: {
            id: "line1",
            anchor: { x: 0.1, y: 0.2 },
            rotation: 0,
            rotationType: "absolute",
            to: { x: 0.2, y: 0 },
          },
        }),
        createShape(getCommonStruct, "text", {
          id: "text4",
          attachment: {
            id: "line1",
            anchor: { x: 0.1, y: 0.2 },
            rotation: 0,
            rotationType: "absolute",
            to: { x: 0.9, y: 0 },
          },
        }),
      ],
    });

    const result = patchBySplitAttachingLine(shapeComposite, "line1", "line2", 0.5);
    expect(result["text1"].parentId).toBe("line1");
    expect((result["text1"] as any).lineAttached).toBeCloseTo(0.6);
    expect(result["text2"].parentId).toBe("line2");
    expect((result["text2"] as any).lineAttached).toBeCloseTo(0.4);
    expect(result["text3"].attachment?.id).toBe("line1");
    expect(result["text3"].attachment?.to.x).toBeCloseTo(0.4);
    expect(result["text4"].attachment?.id).toBe("line2");
    expect(result["text4"].attachment?.to.x).toBeCloseTo(0.8);
  });
});

describe("getInheritableVnNodeProperties", () => {
  test("should inherit specific properties from a VN node shape", () => {
    const vnNode: VnNodeShape = createShape<VnNodeShape>(getCommonStruct, "vn_node", {
      id: "node1",
      parentId: "parent1",
      alpha: 0.5,
      noExport: true,
      fill: createFillStyle({ color: COLORS.GRAY_1 }),
      stroke: createStrokeStyle({ color: COLORS.YELLOW }),
      r: 10,
      attachment: { id: "aaa", anchor: { x: 0, y: 0 }, rotation: 0, rotationType: "absolute", to: { x: 0, y: 0 } },
      locked: true,
      clipping: true,
      cropClipBorder: true,
    });

    const inheritedStyle = getInheritableVnNodeProperties(vnNode);
    expect(inheritedStyle).toEqual({
      parentId: "parent1",
      alpha: 0.5,
      noExport: true,
      fill: createFillStyle({ color: COLORS.GRAY_1 }),
      stroke: createStrokeStyle({ color: COLORS.YELLOW }),
      r: 10,
    });
  });

  test("should return undefined if no VN node shape is provided", () => {
    const inheritedStyle = getInheritableVnNodeProperties(undefined);
    expect(inheritedStyle).toBeUndefined();
  });
});
