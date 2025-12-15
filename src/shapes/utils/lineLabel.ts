import { add, IVec2 } from "okageo";
import { LineShape, isLineShape } from "../line";
import { TextShape, isTextShape, patchPosition } from "../text";
import { getRotateFn } from "../../utils/geometry";
import { Shape } from "../../models";
import { ShapeComposite } from "../../composables/shapeComposite";
import { getClosestOutlineInfoOfLine, getLineEdgeInfo } from "./line";

export function attachLabelToLine(line: LineShape, label: TextShape, margin = 0): Partial<TextShape> {
  const anchorP = getLineLabelAnchorPoint(label, margin);
  const closestInfo = getClosestOutlineInfoOfLine(line, anchorP, Infinity);
  if (!closestInfo) return { p: line.p };

  const [closestPedal, rate] = closestInfo;
  let patch: Partial<TextShape> = {};

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

export function getLineLabelAnchorPoint(label: TextShape, margin = 0): IVec2 {
  const center = { x: label.width / 2, y: label.height / 2 };
  const rotateFn = getRotateFn(label.rotation, center);

  let x: number;
  switch (label.hAlign) {
    case "center":
      x = label.width / 2;
      break;
    case "right":
      x = label.width + margin;
      break;
    default:
      x = -margin;
      break;
  }

  let y: number;
  switch (label.vAlign) {
    case "center":
      y = label.height / 2;
      break;
    case "bottom":
      y = label.height + margin;
      break;
    default:
      y = -margin;
      break;
  }

  return add(rotateFn({ x, y }), label.p);
}
