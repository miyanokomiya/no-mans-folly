import { describe, test, expect } from "vitest";
import { createShape, getCommonStruct } from "../../shapes";
import { TextShape } from "../../shapes/text";
import { newShapeComposite } from "../shapeComposite";
import { canJoinGeneralLayout, canShapesJoinGeneralLayout } from "./layoutHandler";

describe("canJoinAlignBox / canShapesJoinAlignBox", () => {
  const rect0 = createShape(getCommonStruct, "rectangle", {
    id: "rect0",
  });
  const line0 = createShape(getCommonStruct, "line", {
    id: "line0",
  });
  const label0 = createShape<TextShape>(getCommonStruct, "text", {
    id: "label0",
    parentId: line0.id,
    lineAttached: 0.5,
  });
  const group0 = createShape(getCommonStruct, "group", {
    id: "group0",
  });
  const child0 = createShape(getCommonStruct, "rectangle", {
    id: "child0",
    parentId: group0.id,
  });
  const child1 = createShape(getCommonStruct, "rectangle", {
    id: "child1",
    parentId: "unknown",
  });
  const align = createShape(getCommonStruct, "align_box", {
    id: "align",
  });
  const align_child = createShape(getCommonStruct, "rectangle", {
    id: "align_child",
    parentId: align.id,
  });
  const treeRoot = createShape(getCommonStruct, "tree_root", {
    id: "treeRoot",
  });
  const treeNode = createShape(getCommonStruct, "tree_node", {
    id: "treeNode",
    parentId: treeRoot.id,
  });
  const frame = createShape(getCommonStruct, "frame", {
    id: "frame",
  });
  const frameAlignGroup = createShape(getCommonStruct, "frame_align_group", {
    id: "frameAlignGroup",
  });
  const vnnode = createShape(getCommonStruct, "vn_node", {
    id: "vnnode",
  });
  const shapeComposite = newShapeComposite({
    shapes: [
      rect0,
      line0,
      label0,
      group0,
      child0,
      child1,
      align,
      align_child,
      treeRoot,
      treeNode,
      frame,
      frameAlignGroup,
      vnnode,
    ],
    getStruct: getCommonStruct,
  });

  test("canJoinAlignBox: should return true when a shape can attend to align box", () => {
    expect(canJoinGeneralLayout(shapeComposite, rect0)).toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, line0)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, label0)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, group0)).toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, child0), "child of group shape").toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, child1), "child of missing shape").toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, align_child), "child of align box shape").toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, treeRoot)).toBe(true);
    expect(canJoinGeneralLayout(shapeComposite, treeNode), "child of tree root shape").toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, frame)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, frameAlignGroup)).toBe(false);
    expect(canJoinGeneralLayout(shapeComposite, vnnode)).toBe(false);
  });

  test("canShapesJoinAlignBox: should return true when all shapes can attend to align box", () => {
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, line0]), "invalid shape type").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, label0]), "different parents").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, group0])).toBe(true);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, child0]), "different parents").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [rect0, child1])).toBe(true);
    expect(canShapesJoinGeneralLayout(shapeComposite, [child0, align_child]), "different parents").toBe(false);
    expect(canShapesJoinGeneralLayout(shapeComposite, [align_child])).toBe(true);
  });
});
