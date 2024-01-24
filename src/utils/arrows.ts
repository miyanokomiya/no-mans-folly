import { IVec2, add, getDistance, getRadian, isSame, rotate, sub } from "okageo";
import * as arrowModule from "../shapes/oneSidedArrow";
import * as arrowTwoModule from "../shapes/twoSidedArrow";
import { getNormalizedSimplePolygonShape } from "../shapes/simplePolygon";
import { Direction4 } from "../models";

export type ArrowCommonShape = arrowModule.OneSidedArrowShape | arrowTwoModule.TwoSidedArrowShape;

export function getHeadControlPoint(shape: ArrowCommonShape) {
  if (arrowModule.isOneSidedArrowShape(shape)) return arrowModule.getHeadControlPoint(shape);
  return arrowTwoModule.getHeadControlPoint(shape);
}

export function getHeadMaxLength(shape: ArrowCommonShape): number {
  const sampleShape: ArrowCommonShape = { ...shape, headControl: { x: 1, y: 1 } };
  return getArrowHeadLength(sampleShape);
}

export function getArrowHeadPoint(shape: ArrowCommonShape): IVec2 {
  const nshape = getNormalizedSimplePolygonShape(shape);
  const c = { x: nshape.width / 2, y: nshape.height / 2 };
  return add(rotate({ x: nshape.width, y: c.y }, nshape.rotation, c), nshape.p);
}

export function getArrowTailPoint(shape: ArrowCommonShape): IVec2 {
  const nshape = getNormalizedSimplePolygonShape(shape);
  const c = { x: nshape.width / 2, y: nshape.height / 2 };
  return add(rotate({ x: 0, y: c.y }, nshape.rotation, c), nshape.p);
}

export function getArrowHeadLength(shape: ArrowCommonShape): number {
  switch (shape.direction) {
    case 0:
    case 2:
      return shape.height * shape.headControl.x;
    default:
      return shape.width * shape.headControl.x;
  }
}

export function getMinLength(shape: ArrowCommonShape): number {
  const headLength = getArrowHeadLength(shape);
  if (arrowModule.isOneSidedArrowShape(shape)) return headLength;
  return headLength * 2;
}

export function getArrowDirection(shape: ArrowCommonShape): Direction4 {
  return shape.direction ?? 1;
}

export function patchToMoveHead(shape: ArrowCommonShape, p: IVec2) {
  const currentHeadP = getArrowHeadPoint(shape);
  const tailP = getArrowTailPoint(shape);
  const currentDistance = getDistance(currentHeadP, tailP);
  const nextDistance = Math.max(getDistance(p, tailP), getArrowHeadLength(shape));
  const rate = nextDistance / currentDistance;
  const patch = {
    headControl: { x: shape.headControl.x / rate, y: shape.headControl.y },
  } as Partial<ArrowCommonShape>;

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

  const tmpTailP = getArrowTailPoint({ ...shape, ...patch } as ArrowCommonShape);
  if (!isSame(tailP, tmpTailP)) {
    const tailAdjustment = sub(tailP, tmpTailP);
    patch.p = add(shape.p, tailAdjustment);
  }
  return patch;
}

export function patchToMoveTail(src: ArrowCommonShape, p: IVec2): Partial<ArrowCommonShape> {
  const headP = getArrowHeadPoint(src);
  const currentTailP = getArrowTailPoint(src);
  const currentDistance = getDistance(headP, currentTailP);
  const nextDistance = Math.max(getDistance(headP, p), getMinLength(src));
  const rate = nextDistance / currentDistance;

  const patch = {
    headControl: { x: src.headControl.x / rate, y: src.headControl.y },
  } as Partial<ArrowCommonShape>;
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

  const tmpHeadP = getArrowHeadPoint({ ...src, ...patch } as ArrowCommonShape);
  if (!isSame(headP, tmpHeadP)) {
    const headAdjustment = sub(headP, tmpHeadP);
    patch.p = add(src.p, headAdjustment);
  }
  return patch;
}
