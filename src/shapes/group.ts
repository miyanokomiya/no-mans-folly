import { ShapeContext, ShapeStruct, canHaveOutlineWithinGroup, createBaseShape } from "./core";
import { ClipRule, Shape } from "../models";
import { getRectPoints, getRotateFn, getWrapperRect } from "../utils/geometry";
import { IVec2, applyAffine, getCenter, getOuterRectangle, getRadian, getRectCenter, rotate } from "okageo";
import { splitList } from "../utils/commons";

export type GroupShape = Shape & {
  type: "group";
  clipRule?: ClipRule; // undefined means "out"
};

/**
 * Filters children based on noBounds property.
 * When there are multiple children, excludes those with noBounds: true.
 * When there's only one child, always includes it regardless of noBounds value.
 */
function filterChildrenForBounds<T extends { id: string }>(children: T[], shapeContext: ShapeContext): T[] {
  const boundsContributingChildren = children.filter((c) => {
    const s = shapeContext.shapeMap[c.id];
    return s && !s.noBounds;
  });

  // Only use filtered list if there are children that contribute to bounds
  return boundsContributingChildren.length > 0 ? boundsContributingChildren : children;
}

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
      clipRule: arg.clipRule,
    };
  },
  // TODO: Bounds can be rendered with fill and stroke style.
  render() {},
  getClipPath() {
    return new Path2D();
  },
  createSVGElementInfo() {
    return { tag: "g" };
  },
  getWrapperRect(shape, shapeContext, includeBounds) {
    const children = shapeContext?.treeNodeMap[shape.id].children;
    if (!children || children.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    let targetList = children;
    if (includeBounds) {
      // Omit invisible clipping shapes when they work.
      const [others, icList] = splitList(children, (s) => canHaveOutlineWithinGroup(shapeContext.shapeMap[s.id]));
      targetList = icList.length > 0 && others.length > 0 ? others : children;
    }

    // Filter out children with noBounds property, unless there's only one child
    targetList = filterChildrenForBounds(targetList, shapeContext);

    const rects = targetList.map((c) => {
      const s = shapeContext.shapeMap[c.id];
      return shapeContext.getStruct(s.type).getWrapperRect(s, shapeContext, includeBounds);
    });
    return getWrapperRect(rects);
  },
  getLocalRectPolygon(shape, shapeContext) {
    if (!shapeContext) return getRectPoints(struct.getWrapperRect(shape, shapeContext));

    const tree = shapeContext.treeNodeMap[shape.id];
    if (tree.children.length === 0) return getRectPoints(struct.getWrapperRect(shape, shapeContext));

    // Filter out children with noBounds property, unless there's only one child
    const targetChildren = filterChildrenForBounds(tree.children, shapeContext);

    const innerPoints: IVec2[] = [];
    targetChildren.forEach((ct) => {
      const cn = shapeContext.shapeMap[ct.id];
      const points = shapeContext.getStruct(cn.type).getLocalRectPolygon(cn, shapeContext);
      innerPoints.push(...points);
    });

    const wrapper = getOuterRectangle([innerPoints]);
    const c = getRectCenter(wrapper);
    const rotateFn = getRotateFn(shape.rotation, c);
    const rotatedInnserPoints = innerPoints.map((p) => rotateFn(p, true));
    return getRectPoints(getOuterRectangle([rotatedInnserPoints])).map((p) => rotateFn(p));
  },
  isPointOn(shape, p, shapeContext, scale) {
    return shapeContext ? isPointOnGroup(shape, p, shapeContext, scale) : false;
  },
  resize(shape, resizingAffine, shapeContext) {
    if (!shapeContext) return {};

    const localRect = struct.getLocalRectPolygon(shape, shapeContext);
    const resizedLocalRect = localRect.map((p) => applyAffine(resizingAffine, p));
    const rotation = getRadian(resizedLocalRect[1], resizedLocalRect[0]);

    const ret: Partial<GroupShape> = {};

    if (shape.rotation !== rotation) {
      ret.rotation = rotation;
    }

    return ret;
  },
  getSnappingLines() {
    return { v: [], h: [] };
  },
  getActualPosition(shape, shapeContext) {
    const rectPath = struct.getLocalRectPolygon(shape, shapeContext);
    const c = getCenter(rectPath[0], rectPath[2]);
    return rotate(rectPath[0], -shape.rotation, c);
  },
  shouldDelete(shape, shapeContext) {
    // Should delete when there's no children.
    for (const id in shapeContext.shapeMap) {
      const exist = shape.id === shapeContext.shapeMap[id].parentId;
      if (exist) return false;
    }
    return true;
  },
};

export function isGroupShape(shape: Shape): shape is GroupShape {
  return shape.type === "group";
}

export function isPointOnGroup(shape: Shape, p: IVec2, shapeContext: ShapeContext, scale?: number) {
  const children = shapeContext?.treeNodeMap[shape.id].children;
  if (!children || children.length === 0) return false;

  return children.some((c) => {
    const s = shapeContext.shapeMap[c.id];
    return shapeContext.getStruct(s.type).isPointOn(s, p, shapeContext, scale);
  });
}
