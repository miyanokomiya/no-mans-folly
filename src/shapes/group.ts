import { ShapeStruct, createBaseShape } from "./core";
import { Shape } from "../models";
import { getRectPoints, getWrapperRect } from "../utils/geometry";

type GroupShape = Shape;

/**
 * This shape doesn't have own stable bounds.
 * Bounds should be derived from children.
 * "p" is always at the origin: { x: 0, y: 0 } or unstable.
 */
export const struct: ShapeStruct<GroupShape> = {
  label: "Group",
  create(arg = {}) {
    return {
      ...createBaseShape(arg),
      type: "group",
    };
  },
  // TODO: Bounds can be rendered with fill and stroke style.
  render() {},
  getWrapperRect(shape, shapeContext) {
    if (!shapeContext) return { x: 0, y: 0, width: 0, height: 0 };

    const treeNode = shapeContext.treeNodeMap[shape.id];
    const rects = treeNode.children.map((c) => {
      const s = shapeContext.shapeMap[c.id];
      return shapeContext.getStruct(s.type).getWrapperRect(s, shapeContext);
    });
    return getWrapperRect(rects);
  },
  getLocalRectPolygon(shape, shapeContext) {
    return getRectPoints(struct.getWrapperRect(shape, shapeContext));
  },
  isPointOn(shape, p, shapeContext) {
    if (!shapeContext) return false;

    const treeNode = shapeContext.treeNodeMap[shape.id];
    return treeNode.children.some((c) => {
      const s = shapeContext.shapeMap[c.id];
      return shapeContext.getStruct(s.type).isPointOn(s, p, shapeContext);
    });
  },
  resize() {
    return {};
  },
  getSnappingLines() {
    return { v: [], h: [] };
  },
};

export function isGroupShape(shape: Shape): shape is GroupShape {
  return shape.type === "group";
}
