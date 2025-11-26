import { getRectCenter } from "okageo";
import { LineShape, isLineShape } from "../line";
import { TextShape, isTextShape, patchPosition } from "../text";
import { getRotateFn } from "../../utils/geometry";
import { Shape } from "../../models";
import { ShapeComposite } from "../../composables/shapeComposite";
import { getClosestOutlineInfoOfLine, getLineEdgeInfo } from "./line";

export function attachLabelToLine(line: LineShape, label: TextShape, margin = 0): Partial<TextShape> {
  const labelBounds = { x: label.p.x, y: label.p.y, width: label.width, height: label.height };
  const labelCenter = getRectCenter(labelBounds);
  const rotateFn = getRotateFn(-label.rotation, labelCenter);

  const closestInfo = getClosestOutlineInfoOfLine(line, labelCenter, Infinity);
  if (!closestInfo) return { p: line.p };

  const [closestPedal, rate] = closestInfo;
  let patch: Partial<TextShape> = {};

  const rotatedClosestPedal = rotateFn(closestPedal);
  if (rotatedClosestPedal.x <= labelBounds.x) {
    patch.hAlign = "left";
  } else if (labelBounds.x + labelBounds.width <= rotatedClosestPedal.x) {
    patch.hAlign = "right";
  } else {
    patch.hAlign = "center";
  }

  if (rotatedClosestPedal.y <= labelBounds.y) {
    patch.vAlign = "top";
  } else if (labelBounds.y + labelBounds.height <= rotatedClosestPedal.y) {
    patch.vAlign = "bottom";
  } else {
    patch.vAlign = "center";
  }

  patch.lineAttached = rate;

  const edgeInfo = getLineEdgeInfo(line);
  const distP = edgeInfo.lerpFn?.(rate) ?? closestPedal;
  patch = { ...patch, ...patchPosition({ ...label, ...patch }, distP, margin) };

  const ret = { ...patch };
  if (ret.hAlign === label.hAlign) {
    delete ret.hAlign;
  }
  if (ret.vAlign === label.vAlign) {
    delete ret.vAlign;
  }
  if (ret.lineAttached === label.lineAttached) {
    delete ret.lineAttached;
  }

  return ret;
}

export function isLineLabelShape(
  shapeComposite: ShapeComposite,
  shape: Shape,
): shape is TextShape & Required<Pick<Shape, "parentId">> {
  const parent = shapeComposite.shapeMap[shape.parentId ?? ""];
  return !!parent && isLineShape(parent) && isTextShape(shape) && shape.lineAttached !== undefined;
}
