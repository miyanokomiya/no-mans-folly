import { getRectCenter, IRectangle } from "okageo";
import { FrameShape, isFrameShape } from "../shapes/frame";
import { expandRect, isPointOnRectangle } from "../utils/geometry";
import { ShapeComposite } from "./shapeComposite";
import { getStrokeWidth } from "../utils/strokeStyle";

export function getAllFrameShapes(shapeComposite: ShapeComposite): FrameShape[] {
  return shapeComposite.shapes.filter((s) => isFrameShape(s));
}

export function getRootShapeIdsByFrame(shapeComposite: ShapeComposite, frame: FrameShape): string[] {
  const frameRect = shapeComposite.getWrapperRect(frame);
  return shapeComposite.mergedShapeTree
    .filter((t) => {
      const s = shapeComposite.mergedShapeMap[t.id];
      if (isFrameShape(s)) return false;

      const rect = shapeComposite.getWrapperRect(s);
      return isPointOnRectangle(frameRect, getRectCenter(rect));
    })
    .map((s) => s.id);
}

export function getFrameRect(frame: FrameShape, includeBorder = false): IRectangle {
  const rect = { x: frame.p.x, y: frame.p.y, width: frame.width, height: frame.height };
  return includeBorder ? expandRect(rect, getStrokeWidth(frame.stroke) / 2) : rect;
}
