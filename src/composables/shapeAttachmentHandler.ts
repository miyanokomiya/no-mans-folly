import { Shape } from "../models";
import { hasSpecialOrderPriority } from "../shapes";
import { isGroupShape } from "../shapes/group";
import { isLineShape } from "../shapes/line";
import { mapReduce, toMap } from "../utils/commons";
import { ShapeComposite } from "./shapeComposite";

export function getAttachmentOption(
  shapeComposite: ShapeComposite,
  targetIds: string[],
): "attach" | "detach" | undefined {
  const canAttach = canAttachToShapeByIds(shapeComposite, targetIds);
  if (!canAttach) return;

  // Retruns "detach" when all shapes have "attachment"
  const attachableShapes = targetIds
    .map((id) => shapeComposite.shapeMap[id])
    .filter((s) => !!s && canAttachToShape(shapeComposite, s));
  return attachableShapes.some((s) => !s.attachment) ? "attach" : "detach";
}

function canAttachToShapeByIds(shapeComposite: ShapeComposite, targetIds: string[]): boolean {
  return targetIds.some((id) => {
    const s = shapeComposite.shapeMap[id];
    return !!s && canAttachToShape(shapeComposite, s);
  });
}

export function canAttachToShape(shapeComposite: ShapeComposite, shape: Shape): boolean {
  if (hasSpecialOrderPriority(shapeComposite.getShapeStruct, shape)) return false;
  if (isLineShape(shape)) return false;

  // Attachable shape can be a child of a group shape.
  if (!shapeComposite.hasParent(shape)) return true;
  const parent = shapeComposite.shapeMap[shape.parentId];
  return isGroupShape(parent);
}

export function canDetachFromShape(shapeComposite: ShapeComposite, shape: Shape): boolean {
  if (!canAttachToShape(shapeComposite, shape)) return false;
  return !!shape.attachment;
}

export function getPatchByDetachFromShape(
  shapeComposite: ShapeComposite,
  targetIds: string[],
): Record<string, Partial<Shape>> {
  return mapReduce(
    toMap(
      targetIds.map((id) => shapeComposite.shapeMap[id]).filter((s) => !!s && canDetachFromShape(shapeComposite, s)),
    ),
    () => ({ attachment: undefined }),
  );
}
