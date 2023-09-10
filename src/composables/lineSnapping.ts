import { IVec2, add, getDistance, getUnit, isSame, multi, sub } from "okageo";
import { GetShapeStruct, getIntersectedOutlines, getClosestOutline, getLocationRateOnShape } from "../shapes";
import { ConnectionPoint, Shape, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";
import { LineShape, getLinePath } from "../shapes/line";
import { ISegment } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { applyPath } from "../utils/renderer";

const SNAP_THRESHOLD = 10;

interface Option {
  movingLine?: LineShape;
  movingIndex?: number;
  snappableShapes: Shape[];
  getShapeStruct: GetShapeStruct;
}

export type ConnectionResult = { connection?: ConnectionPoint; p: IVec2; guidLines?: ISegment[] };

export function newLineSnapping(option: Option) {
  const vertices = option.movingLine ? getLinePath(option.movingLine) : [];
  const adjacentVertices =
    option.movingIndex === undefined
      ? []
      : option.movingIndex === 0
      ? [vertices[1]]
      : option.movingIndex === vertices.length - 1
      ? [vertices[vertices.length - 2]]
      : [vertices[option.movingIndex - 1], vertices[option.movingIndex + 1]];

  function testConnection(point: IVec2, scale: number): ConnectionResult | undefined {
    const threshold = SNAP_THRESHOLD * scale;

    // Try snapping to adjacent vertices
    let selfSnapped: ConnectionResult | undefined;
    {
      const closeX = adjacentVertices.find((v) => Math.abs(point.x - v.x) < threshold);
      const closeY = adjacentVertices.find((v) => Math.abs(point.y - v.y) < threshold);

      if (closeX || closeY) {
        const p = { x: closeX?.x ?? point.x, y: closeY?.y ?? point.y };
        const guidLines: ISegment[] = [];
        if (closeX) guidLines.push([closeX, p]);
        if (closeY) guidLines.push([closeY, p]);

        selfSnapped = { p, guidLines };
      }
    }

    // Extend guide lines to have enough room around the snapped point to check if the lines has an intersection with other shapes' outline.
    const extendedGuideLines =
      selfSnapped?.guidLines?.map((guide) => {
        if (isSame(selfSnapped!.p, guide[0])) return guide;

        const v = multi(getUnit(sub(selfSnapped!.p, guide[0])), threshold);
        return [guide[0], add(selfSnapped!.p, v)];
      }) ?? [];

    // Try snapping to other shapes' outline
    let outline: { p: IVec2; d: number; shape: Shape } | undefined;
    {
      option.snappableShapes.some((shape) => {
        // When src point is snapped to adjacent points, check if it has a close intersection along with the snapping guide lines.
        let intersection: IVec2 | undefined;
        {
          extendedGuideLines.some((guide) => {
            const candidates = getIntersectedOutlines(option.getShapeStruct, shape, guide[0], guide[1]);
            if (candidates) {
              intersection = candidates.find((c) => getDistance(c, selfSnapped!.p) <= threshold);
              return true;
            }
          });
        }

        // If there's no intersection, seek the closest outline point.
        const p = intersection ?? getClosestOutline(option.getShapeStruct, shape, point, threshold);
        if (!p) return;

        // Abandon self snapped when the closest outline is found indenpendently from guide lines.
        if (!intersection) {
          selfSnapped = undefined;
        }

        const dx = p.x - point.x;
        const dy = p.y - point.y;
        const d = dx * dx + dy * dy;
        if (!outline || d < outline.d) {
          outline = { p, d, shape };
          return true;
        }
      });
    }

    if (outline) {
      const connection = {
        rate: getLocationRateOnShape(option.getShapeStruct, outline.shape, outline.p),
        id: outline.shape.id,
      };
      return { connection, p: outline.p, guidLines: selfSnapped?.guidLines?.map((g) => [g[0], outline!.p]) };
    } else if (selfSnapped) {
      return selfSnapped;
    }
  }

  return { testConnection };
}
export type LineSnapping = ReturnType<typeof newLineSnapping>;

export function renderConnectionResult(
  ctx: CanvasRenderingContext2D,
  option: { result: ConnectionResult; scale: number; style: StyleScheme }
) {
  if (option.result.guidLines) {
    applyStrokeStyle(ctx, { color: option.style.selectionSecondaly, width: 2 * option.scale });
    option.result.guidLines.forEach((guide) => {
      ctx.beginPath();
      applyPath(ctx, guide);
      ctx.stroke();
    });
  }

  if (option.result.connection) {
    applyFillStyle(ctx, { color: option.style.selectionSecondaly });
    const size = 5 * option.scale;
    ctx.beginPath();
    ctx.arc(option.result.p.x, option.result.p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}
