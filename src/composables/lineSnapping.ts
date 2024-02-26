import { IRectangle, IVec2, getDistance, getPedal, getRectCenter, isSame } from "okageo";
import {
  GetShapeStruct,
  getIntersectedOutlines,
  getClosestOutline,
  getLocationRateOnShape,
  isRectangularOptimizedSegment,
} from "../shapes";
import { ConnectionPoint, Shape, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";
import { LineShape, getLinePath, isLineShape } from "../shapes/line";
import { ISegment, TAU, extendSegment, isRectOverlappedH, isRectOverlappedV } from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { applyPath } from "../utils/renderer";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { isLineLabelShape } from "../shapes/text";
import { pickMinItem } from "../utils/commons";

const SNAP_THRESHOLD = 10;

interface Option {
  movingLine?: LineShape;
  movingIndex?: number;
  snappableShapes: Shape[];
  getShapeStruct: GetShapeStruct;
}

export type ConnectionResult = { connection?: ConnectionPoint; p: IVec2; guidLines?: ISegment[]; optimized?: boolean };

export function newLineSnapping(option: Option) {
  const reversedSnappableShapes = option.snappableShapes.concat().reverse();
  const vertices = option.movingLine ? getLinePath(option.movingLine) : [];
  const isEndVertex = option.movingIndex === 0 || option.movingIndex === vertices.length - 1;
  const adjacentVertices =
    vertices.length === 0 || option.movingIndex === undefined
      ? []
      : option.movingIndex === 0
        ? [vertices[1]]
        : option.movingIndex === vertices.length - 1
          ? [vertices[vertices.length - 2]]
          : [vertices[option.movingIndex - 1], vertices[option.movingIndex + 1]];

  function testConnection(point: IVec2, scale: number): ConnectionResult | undefined {
    const threshold = SNAP_THRESHOLD * scale;

    let selfSnapped: ConnectionResult | undefined;
    // Try snapping to adjacent vertices: On a line.
    if (option.movingLine && option.movingIndex !== undefined) {
      const targetVertex = vertices[option.movingIndex];
      const candidates = adjacentVertices.map<[IVec2, ISegment, number]>((adjacent) => {
        const guidLine: ISegment = [targetVertex, adjacent];
        const p = getPedal(point, guidLine);
        return [p, guidLine, getDistance(p, point)];
      });

      const closest = pickMinItem(candidates, (c) => c[2]);
      if (closest && closest[2] < threshold) {
        selfSnapped = {
          p: closest[0],
          guidLines: [
            [closest[1][0], closest[0]],
            [closest[1][1], closest[0]],
          ],
        };
      }
    }

    // Try snapping to adjacent vertices: Vertically or horizontally.
    // Prioritize "On a line" result.
    if (!selfSnapped) {
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

        const seg: ISegment = [guide[0], selfSnapped!.p];
        return extendSegment(seg, 1 + threshold / getDistance(seg[0], seg[1]));
      }) ?? [];

    // Try snapping to other shapes' outline
    let outline: { p: IVec2; d: number; shape: Shape; optimized?: boolean } | undefined;
    {
      const shapeComposite = newShapeComposite({
        shapes: reversedSnappableShapes,
        getStruct: option.getShapeStruct,
      });
      reversedSnappableShapes.some((shape) => {
        // When src point is snapped to adjacent points, check if it has a close intersection along with the snapping guide lines.
        let intersection: IVec2 | undefined;
        if (selfSnapped) {
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
        if (!p) {
          if (isEndVertex) {
            const rect = shapeComposite.getWrapperRect(shape);
            const c = getRectCenter(rect);
            const d = getDistance(c, point);
            if (d < threshold) {
              outline = { p: c, d, shape, optimized: true };
              selfSnapped = undefined;
              return true;
            }
          }
          return;
        }

        // Abandon self snapped when the closest outline is found indenpendently from guide lines.
        if (!intersection) {
          selfSnapped = undefined;
        }

        const d = getDistance(p, point);
        if (!outline || d < outline.d) {
          outline = { p, d, shape };
          return true;
        }
      });
    }

    if (outline) {
      const connection: ConnectionPoint = {
        rate: getLocationRateOnShape(option.getShapeStruct, outline.shape, outline.p),
        id: outline.shape.id,
      };
      if (outline.optimized) connection.optimized = true;

      return {
        connection,
        p: outline.p,
        guidLines: selfSnapped?.guidLines?.map((g) => [g[0], outline!.p]),
        optimized: outline.optimized,
      };
    } else if (selfSnapped) {
      return selfSnapped;
    }
  }

  return { testConnection };
}
export type LineSnapping = ReturnType<typeof newLineSnapping>;

export function renderConnectionResult(
  ctx: CanvasRenderingContext2D,
  option: { result: ConnectionResult; scale: number; style: StyleScheme },
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
    ctx.arc(option.result.p.x, option.result.p.y, size, 0, TAU);
    ctx.fill();
  }
}

export function getOptimizedSegment(
  shapeComposite: ShapeComposite,
  shapeA: Shape,
  shapeB: Shape,
): ISegment | undefined {
  const rectangularA = isRectangularOptimizedSegment(shapeComposite.getShapeStruct, shapeA);
  const rectangularB = isRectangularOptimizedSegment(shapeComposite.getShapeStruct, shapeB);

  if (rectangularA && rectangularB) {
    const rectA = shapeComposite.getWrapperRect(shapeA);
    const rectB = shapeComposite.getWrapperRect(shapeB);
    const [baseA, baseB] = getMimumSegmentBetweenRecs(rectA, rectB);
    // extend lines to seek intersections
    const d = getDistance(baseB, baseA);
    const segForA = extendSegment([baseB, baseA], 1 + (rectA.width + rectA.height) / d);
    const segForB = extendSegment([baseA, baseB], 1 + (rectB.width + rectB.height) / d);
    const pA = getIntersectedOutlines(shapeComposite.getShapeStruct, shapeA, segForA[0], segForA[1])?.[0];
    const pB = getIntersectedOutlines(shapeComposite.getShapeStruct, shapeB, segForB[0], segForB[1])?.[0];
    return pA && pB ? [pA, pB] : undefined;
  } else if (rectangularA) {
    const rectB = shapeComposite.getWrapperRect(shapeB);
    const centerB = getRectCenter(rectB);
    const seg = getOptimizedSegmentBetweenShapeAndPoint(shapeComposite, shapeA, centerB);
    if (!seg) return;

    const pB = getIntersectedOutlines(shapeComposite.getShapeStruct, shapeB, seg[0], seg[1])?.[0];
    return pB ? [seg[0], pB] : undefined;
  } else if (rectangularB) {
    const rectA = shapeComposite.getWrapperRect(shapeA);
    const centerA = getRectCenter(rectA);
    const seg = getOptimizedSegmentBetweenShapeAndPoint(shapeComposite, shapeB, centerA);
    if (!seg) return;

    const pA = getIntersectedOutlines(shapeComposite.getShapeStruct, shapeA, seg[0], seg[1])?.[0];
    return pA ? [pA, seg[0]] : undefined;
  } else {
    const rectA = shapeComposite.getWrapperRect(shapeA);
    const centerA = getRectCenter(rectA);
    const rectB = shapeComposite.getWrapperRect(shapeB);
    const centerB = getRectCenter(rectB);
    const pA = getIntersectedOutlines(shapeComposite.getShapeStruct, shapeA, centerB, centerA)?.[0];
    const pB = getIntersectedOutlines(shapeComposite.getShapeStruct, shapeB, centerA, centerB)?.[0];
    return pA && pB ? [pA, pB] : undefined;
  }
}

function getOptimizedSegmentBetweenShapeAndPoint(
  shapeComposite: ShapeComposite,
  shape: Shape,
  point: IVec2,
): ISegment | undefined {
  const rect = shapeComposite.getWrapperRect(shape);
  if (isRectangularOptimizedSegment(shapeComposite.getShapeStruct, shape)) {
    const [baseA, baseB] = getMimumSegmentBetweenRecs(rect, { ...point, width: 0, height: 0 });
    const pA = getIntersectedOutlines(shapeComposite.getShapeStruct, shape, baseB, baseA)?.[0];
    return pA ? [pA, point] : undefined;
  } else {
    const pA = getIntersectedOutlines(shapeComposite.getShapeStruct, shape, point, getRectCenter(rect))?.[0];
    return pA ? [pA, point] : undefined;
  }
}

function getMimumSegmentBetweenRecs(rectA: IRectangle, rectB: IRectangle): ISegment {
  let baseA: IVec2 | undefined;
  let baseB: IVec2 | undefined;

  if (isRectOverlappedH(rectA, rectB)) {
    const [, from, to] = [rectA.y, rectA.y + rectA.height, rectB.y, rectB.y + rectB.height].sort((a, b) => a - b);
    const y = (from + to) / 2;
    baseA = { x: rectA.x + rectA.width / 2, y };
    baseB = { x: rectB.x + rectB.width / 2, y };
  } else if (isRectOverlappedV(rectA, rectB)) {
    const [, from, to] = [rectA.x, rectA.x + rectA.width, rectB.x, rectB.x + rectB.width].sort((a, b) => a - b);
    const x = (from + to) / 2;
    baseA = { x, y: rectA.y + rectA.height / 2 };
    baseB = { x, y: rectB.y + rectB.height / 2 };
  } else if (rectA.x + rectA.width < rectB.x && rectA.y + rectA.height < rectB.y) {
    // B is at the bottom right of A
    baseA = { x: rectA.x + rectA.width, y: rectA.y + rectA.height };
    baseB = { x: rectB.x, y: rectB.y };
  } else if (rectB.x + rectB.width < rectA.x && rectA.y + rectA.height < rectB.y) {
    // B is at the bottom left of A
    baseA = { x: rectA.x, y: rectA.y + rectA.height };
    baseB = { x: rectB.x + rectB.width, y: rectB.y };
  } else if (rectB.x + rectB.width < rectA.x && rectB.y + rectB.height < rectA.y) {
    // B is at the top left of A
    baseA = { x: rectA.x, y: rectA.y };
    baseB = { x: rectB.x + rectB.width, y: rectB.y + rectB.height };
  } else {
    // B is at the top right of A
    baseA = { x: rectA.x + rectA.width, y: rectA.y };
    baseB = { x: rectB.x, y: rectB.y + rectB.height };
  }

  return [baseA, baseB];
}

export function optimizeLinePath(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">,
  lineShape: LineShape,
): Partial<LineShape> | undefined {
  const shapeComposite = ctx.getShapeComposite();
  const vertices = getLinePath(lineShape);
  // When the line is elbow, always optimize it based on "p" and "q"
  const elbow = lineShape.lineType === "elbow";

  if (lineShape.pConnection?.optimized) {
    if (lineShape.qConnection?.optimized) {
      if (vertices.length === 2 || elbow) {
        const shapeMap = shapeComposite.shapeMap;
        const shapeP = shapeMap[lineShape.pConnection.id];
        const shapeQ = shapeMap[lineShape.qConnection.id];
        const seg = getOptimizedSegment(shapeComposite, shapeP, shapeQ);
        if (!seg) return;

        const [p, q] = seg;
        const patchP: Partial<LineShape> = isSame(p, lineShape.p)
          ? {}
          : {
              p,
              pConnection: {
                ...lineShape.pConnection,
                rate: getLocationRateOnShape(shapeComposite.getShapeStruct, shapeP, p),
              },
            };
        const patchQ: Partial<LineShape> = isSame(q, lineShape.q)
          ? {}
          : {
              q,
              qConnection: {
                ...lineShape.qConnection,
                rate: getLocationRateOnShape(shapeComposite.getShapeStruct, shapeQ, q),
              },
            };
        const ret = { ...patchP, ...patchQ };
        return Object.keys(ret).length > 0 ? ret : undefined;
      }
    }
  }

  const ret: Partial<LineShape> = {};

  if (lineShape.pConnection?.optimized) {
    const shapeMap = shapeComposite.shapeMap;
    const shapeP = shapeMap[lineShape.pConnection.id];
    const seg = getOptimizedSegmentBetweenShapeAndPoint(shapeComposite, shapeP, vertices[1]);
    if (!seg) return;

    const p = seg[0];
    if (!isSame(p, lineShape.p)) {
      ret.p = p;
      ret.pConnection = {
        ...lineShape.pConnection,
        rate: getLocationRateOnShape(shapeComposite.getShapeStruct, shapeP, p),
      };
    }
  }

  if (lineShape.qConnection?.optimized) {
    const shapeMap = shapeComposite.shapeMap;
    const shapeQ = shapeMap[lineShape.qConnection.id];
    const seg = getOptimizedSegmentBetweenShapeAndPoint(shapeComposite, shapeQ, vertices[vertices.length - 2]);
    if (!seg) return;

    const q = seg[0];
    if (!isSame(q, lineShape.q)) {
      ret.q = q;
      ret.qConnection = {
        ...lineShape.qConnection,
        rate: getLocationRateOnShape(shapeComposite.getShapeStruct, shapeQ, q),
      };
    }
  }

  return Object.keys(ret).length > 0 ? ret : undefined;
}

export function isLineSnappableShape(shape: Shape): boolean {
  return !isLineShape(shape) && !isLineLabelShape(shape);
}
