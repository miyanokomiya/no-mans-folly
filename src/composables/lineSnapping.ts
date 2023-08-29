import { IVec2 } from "okageo";
import { GetShapeStruct, getClosestOutline, getLocationRateOnShape } from "../shapes";
import { ConnectionPoint, Shape, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";

const SNAP_THRESHOLD = 10;

interface Option {
  snappableShapes: Shape[];
  getShapeStruct: GetShapeStruct;
}

export type ConnectionResult = { connection: ConnectionPoint; p: IVec2 };

export function newLineSnapping(option: Option) {
  function testConnection(point: IVec2, scale: number): ConnectionResult | undefined {
    const snappableShapes = option.snappableShapes;

    let outline: { p: IVec2; d: number; shape: Shape } | undefined;
    snappableShapes.forEach((shape) => {
      const p = getClosestOutline(option.getShapeStruct, shape, point, SNAP_THRESHOLD * scale);
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
        rate: getLocationRateOnShape(option.getShapeStruct, outline.shape, outline.p),
        id: outline.shape.id,
      };
      return { connection, p: outline.p };
    }
  }

  return { testConnection };
}
export type LineSnapping = ReturnType<typeof newLineSnapping>;

export function renderConnectionResult(
  ctx: CanvasRenderingContext2D,
  option: { result: ConnectionResult; scale: number; style: StyleScheme }
) {
  applyFillStyle(ctx, { color: option.style.selectionSecondaly });
  const size = 5 * option.scale;
  ctx.beginPath();
  ctx.arc(option.result.p.x, option.result.p.y, size, 0, Math.PI * 2);
  ctx.fill();
}
