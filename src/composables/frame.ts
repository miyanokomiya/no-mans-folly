import { FrameShape, isFrameShape } from "../shapes/frame";
import { ShapeComposite } from "./shapeComposite";

export function getAllFrameShapes(shapeComposite: ShapeComposite): FrameShape[] {
  return shapeComposite.shapes.filter((s) => isFrameShape(s));
}
