import { IVec2 } from "okageo";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { getClosestOutline, getLocationRateOnShape } from "../shapes";
import { ConnectionPoint, Shape } from "../models";

const SNAP_THRESHOLD = 10;

export function getClosestConnection(
  point: IVec2,
  ctx: Pick<AppCanvasStateContext, "getShapeMap" | "getSelectedShapeIdMap" | "getShapeStruct" | "getScale">
): { connection: ConnectionPoint; p: IVec2 } | undefined {
  const shapeMap = ctx.getShapeMap();
  const selectedIds = ctx.getSelectedShapeIdMap();
  const snappableShapes = Object.values(shapeMap).filter((s) => !selectedIds[s.id]);

  let outline: { p: IVec2; d: number; shape: Shape } | undefined;
  snappableShapes.forEach((shape) => {
    const p = getClosestOutline(ctx.getShapeStruct, shape, point, SNAP_THRESHOLD * ctx.getScale());
    if (!p) return;

    const dx = p.x - point.x;
    const dy = p.y - point.y;
    const d = dx * dx + dy * dy;
    if (!outline || d < outline.d) {
      outline = { p, d, shape };
    }
  });

  if (outline) {
    const connection = {
      rate: getLocationRateOnShape(ctx.getShapeStruct, outline.shape, outline.p),
      id: outline.shape.id,
    };
    return { connection, p: outline.p };
  }
}
