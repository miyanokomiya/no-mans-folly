import { Shape } from "../../models";
import { hasSpecialOrderPriority } from "../../shapes";
import { isAlignBoxShape } from "../../shapes/align/alignBox";
import { isGroupShape } from "../../shapes/group";
import { isLineShape } from "../../shapes/line";
import { isTableShape } from "../../shapes/table/table";
import { isVNNodeShape } from "../../shapes/vectorNetworks/vnNode";
import { ShapeComposite } from "../shapeComposite";

export function canJoinGeneralLayout(shapeComposite: ShapeComposite, shape: Shape): boolean {
  if (hasSpecialOrderPriority(shapeComposite.getShapeStruct, shape)) return false;
  // It may be better to let shape structs decide whether the shape can be joined or not.
  // But for now, there's not so many shape types that should be excluded.
  if (isLineShape(shape) || isVNNodeShape(shape)) return false;
  if (!shape.parentId) return true;

  const parent = shapeComposite.shapeMap[shape.parentId];
  if (!parent) return true;

  return isAlignBoxShape(parent) || isTableShape(parent) || isGroupShape(parent);
}

/**
 * Check if all shapes can be joined to the same layout.
 */
export function canShapesJoinGeneralLayout(shapeComposite: ShapeComposite, shapes: Shape[]): boolean {
  if (shapes.length === 0) return false;
  // Check individual shapes.
  if (shapes.some((shape) => !canJoinGeneralLayout(shapeComposite, shape))) return false;

  // Check if all shapes have no parent or the same parent.
  const indexParentId = shapeComposite.hasParent(shapes[0]) ? shapes[0].parentId : undefined;
  if (indexParentId) {
    return shapes.every((shape) => shape.parentId === indexParentId);
  } else {
    return shapes.every((shape) => !shapeComposite.hasParent(shape));
  }
}
