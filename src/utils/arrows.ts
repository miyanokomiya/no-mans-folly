import { IVec2, add, getDistance, getRadian, isSame, sub } from "okageo";
import * as arrowModule from "../shapes/oneSidedArrow";
import * as arrowTwoModule from "../shapes/twoSidedArrow";

export type ArrowCommon = arrowModule.OneSidedArrowShape | arrowTwoModule.TwoSidedArrowShape;

export function getNormalizedArrowShape(shape: ArrowCommon) {
  if (arrowModule.isOneSidedArrowShape(shape)) return arrowModule.getNormalizedArrowShape(shape);
  return arrowTwoModule.getNormalizedArrowShape(shape);
}

export function getHeadControlPoint(shape: ArrowCommon) {
  if (arrowModule.isOneSidedArrowShape(shape)) return arrowModule.getHeadControlPoint(shape);
  return arrowTwoModule.getHeadControlPoint(shape);
}

export function getHeadMaxLength(shape: ArrowCommon): number {
  const sampleShape: ArrowCommon = { ...shape, headControl: { x: 1, y: 1 } };
  if (arrowModule.isOneSidedArrowShape(sampleShape)) return arrowModule.getArrowHeadLength(sampleShape);
  return arrowTwoModule.getArrowHeadLength(sampleShape);
}

export function getArrowHeadPoint(shape: ArrowCommon) {
  if (arrowModule.isOneSidedArrowShape(shape)) return arrowModule.getArrowHeadPoint(shape);
  return arrowTwoModule.getArrowHeadPoint(shape);
}

export function getArrowTailPoint(shape: ArrowCommon) {
  if (arrowModule.isOneSidedArrowShape(shape)) return arrowModule.getArrowTailPoint(shape);
  return arrowTwoModule.getArrowTailPoint(shape);
}

export function getArrowHeadLength(shape: ArrowCommon) {
  if (arrowModule.isOneSidedArrowShape(shape)) return arrowModule.getArrowHeadLength(shape);
  return arrowTwoModule.getArrowHeadLength(shape);
}

export function getMinLength(shape: ArrowCommon) {
  if (arrowModule.isOneSidedArrowShape(shape)) return arrowModule.getArrowHeadLength(shape);
  return arrowTwoModule.getArrowHeadLength(shape) * 2;
}

export function patchToMoveHead(shape: ArrowCommon, p: IVec2) {
  const currentHeadP = getArrowHeadPoint(shape);
  const tailP = getArrowTailPoint(shape);
  const currentDistance = getDistance(currentHeadP, tailP);
  const nextDistance = Math.max(getDistance(p, tailP), getArrowHeadLength(shape));
  const rate = nextDistance / currentDistance;
  const patch = {
    headControl: { x: shape.headControl.x / rate, y: shape.headControl.y },
  } as Partial<ArrowCommon>;

  switch (shape.direction) {
    case 0:
      patch.rotation = getRadian(p, tailP) + Math.PI / 2;
      patch.height = nextDistance;
      break;
    case 2:
      patch.rotation = getRadian(p, tailP) - Math.PI / 2;
      patch.height = nextDistance;
      break;
    case 3:
      patch.rotation = getRadian(p, tailP) - Math.PI;
      patch.width = nextDistance;
      break;
    default:
      patch.rotation = getRadian(p, tailP);
      patch.width = nextDistance;
      break;
  }

  if (patch.rotation === shape.rotation) {
    delete patch.rotation;
  }

  const tmpTailP = getArrowTailPoint({ ...shape, ...patch } as ArrowCommon);
  if (!isSame(tailP, tmpTailP)) {
    const tailAdjustment = sub(tailP, tmpTailP);
    patch.p = add(shape.p, tailAdjustment);
  }
  return patch;
}

export function patchToMoveTail(src: ArrowCommon, p: IVec2): Partial<ArrowCommon> {
  const headP = getArrowHeadPoint(src);
  const currentTailP = getArrowTailPoint(src);
  const currentDistance = getDistance(headP, currentTailP);
  const nextDistance = Math.max(getDistance(headP, p), getMinLength(src));
  const rate = nextDistance / currentDistance;

  const patch = {
    headControl: { x: src.headControl.x / rate, y: src.headControl.y },
  } as Partial<ArrowCommon>;
  switch (src.direction) {
    case 0:
      patch.rotation = getRadian(headP, p) + Math.PI / 2;
      patch.height = nextDistance;
      break;
    case 2:
      patch.rotation = getRadian(headP, p) - Math.PI / 2;
      patch.height = nextDistance;
      break;
    case 3:
      patch.rotation = getRadian(headP, p) - Math.PI;
      patch.width = nextDistance;
      break;
    default:
      patch.rotation = getRadian(headP, p);
      patch.width = nextDistance;
      break;
  }

  if (patch.rotation === src.rotation) {
    delete patch.rotation;
  }

  const tmpHeadP = getArrowHeadPoint({ ...src, ...patch } as ArrowCommon);
  if (!isSame(headP, tmpHeadP)) {
    const headAdjustment = sub(headP, tmpHeadP);
    patch.p = add(src.p, headAdjustment);
  }
  return patch;
}
