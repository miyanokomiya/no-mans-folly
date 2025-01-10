import { getRectCenter } from "okageo";
import { FrameShape, isFrameShape } from "../shapes/frame";
import { isPointOnRectangle } from "../utils/geometry";
import { ShapeComposite } from "./shapeComposite";

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
