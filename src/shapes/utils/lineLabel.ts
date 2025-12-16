import { LineShape, isLineShape } from "../line";
import { TextShape, getLineLabelAnchorPoint, isTextShape, patchPosition } from "../text";
import { Shape } from "../../models";
import { ShapeComposite } from "../../composables/shapeComposite";
import { getLineEdgeInfo } from "./line";
import { getClosestPointOnPolyline } from "../../utils/path";

export function attachLabelToLine(line: LineShape, label: TextShape, margin = 0): Partial<TextShape> {
  const anchorP = getLineLabelAnchorPoint(label, margin);
  const edgeInfo = getLineEdgeInfo(line);
  const closestInfo = getClosestPointOnPolyline(edgeInfo, anchorP, Infinity);
  if (!closestInfo) return { p: line.p };

  const [closestPedal, rate] = closestInfo;
  let patch: Partial<TextShape> = {};

  patch.lineAttached = rate;

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

export function getLabelMargin(line: LineShape): number {
  return (line.stroke.width ?? 1) / 2 + 6;
}
