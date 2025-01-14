import { getRectCenter, IRectangle } from "okageo";
import { FrameShape, isFrameShape } from "../shapes/frame";
import { expandRect, isPointOnRectangle } from "../utils/geometry";
import { ShapeComposite } from "./shapeComposite";
import { applyStrokeStyle, getStrokeWidth } from "../utils/strokeStyle";
import { applyDefaultTextStyle } from "../utils/renderer";
import { COLORS } from "../utils/color";
import { applyFillStyle } from "../utils/fillStyle";
import { GetShapeStruct } from "../shapes/core";
import { createShape } from "../shapes";
import { CanvasCTX } from "../utils/types";

export function getAllFrameShapes(shapeComposite: ShapeComposite): FrameShape[] {
  return shapeComposite.mergedShapes.filter((s) => isFrameShape(s));
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

export function renderFrameNames(ctx: CanvasCTX, shapeComposite: ShapeComposite, scale = 1) {
  const frameShapes = getAllFrameShapes(shapeComposite);
  if (frameShapes.length > 0) {
    ctx.textBaseline = "bottom";
    applyDefaultTextStyle(ctx, 18 * scale);
    applyStrokeStyle(ctx, { color: COLORS.WHITE, width: 3 * scale });
    applyFillStyle(ctx, { color: COLORS.BLACK });
    const mergin = 4 * scale;
    frameShapes.forEach((frame, i) => {
      const rect = getFrameRect(frame, true);
      const text = `${i + 1}. ${frame.name}`;
      ctx.strokeText(text, rect.x, rect.y - mergin);
      ctx.fillText(text, rect.x, rect.y - mergin);
    });
  }
}

export function createNewFrameFromSrc(
  getStruct: GetShapeStruct,
  src: FrameShape,
  id: string,
  findex: string,
): FrameShape {
  const ret = createShape<FrameShape>(getStruct, "frame", {
    id,
    findex,
    width: src.width,
    height: src.height,
    fill: src.fill,
    stroke: src.stroke,
    p: { x: src.p.x, y: src.p.y + src.height + 50 },
  });

  return ret;
}
