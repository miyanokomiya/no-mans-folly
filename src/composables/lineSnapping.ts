import {
  IRectangle,
  IVec2,
  MINVALUE,
  add,
  getCrossBezier3AndBezier3,
  getCrossSegAndBezier3,
  getDistance,
  getNorm,
  getPedal,
  getRectCenter,
  isSame,
  isZero,
  multi,
  sub,
} from "okageo";
import {
  GetShapeStruct,
  getIntersectedOutlines,
  getClosestOutline,
  isRectangularOptimizedSegment,
  getOutlinePaths,
} from "../shapes";
import { ConnectionPoint, Shape, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";
import { LineShape, getLinePath, isLineShape } from "../shapes/line";
import {
  ISegment,
  TAU,
  extendSegment,
  getClosestPointTo,
  getCrossSegAndSeg,
  getD2,
  getLocationFromRateOnRectPath,
  isRectOverlappedH,
  isRectOverlappedV,
  isSameValue,
  pickLongSegment,
} from "../utils/geometry";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { applyCurvePath, applyPath, scaleGlobalAlpha } from "../utils/renderer";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { isObjectEmpty, pickMinItem, splitList } from "../utils/commons";
import { isGroupShape } from "../shapes/group";
import { isLineLabelShape } from "../shapes/utils/lineLabel";
import { isConnectedToCenter } from "../shapes/utils/line";
import {
  filterSnappingTargetsBySecondGuideline,
  getGuidelinesFromSnappingResult,
  optimizeSnappingTargetInfoForPoint,
  renderSnappingResult,
  ShapeSnapping,
  SnappingResult,
} from "./shapeSnapping";
import { CanvasCTX } from "../utils/types";
import { BezierPath } from "../utils/path";

const SNAP_THRESHOLD = 10;

interface Option {
  movingLine?: LineShape;
  movingIndex?: number;
  snappableShapes: Shape[];
  shapeSnapping?: ShapeSnapping;
  getShapeStruct: GetShapeStruct;
  threshold?: number;
  // When true, prevent snapping to the line made by current point and adjacent vertex.
  // This is useful when current point is just a dummy or doesn't have much meaning.
  ignoreCurrentLine?: boolean;
}

export type ConnectionResult = {
  connection?: ConnectionPoint;
  outlineSrc?: string;
  outlineSubSrc?: string;
  p: IVec2;
  guidLines?: ISegment[];
  shapeSnappingResult?: SnappingResult;
};

export function newLineSnapping(option: Option) {
  const reversedSnappableShapes = option.snappableShapes.concat().reverse();
  const vertices = option.movingLine ? getLinePath(option.movingLine) : [];
  const adjacentVertices =
    vertices.length === 0 || option.movingIndex === undefined
      ? []
      : option.movingIndex === 0
        ? [vertices[1]]
        : option.movingIndex === vertices.length - 1
          ? [vertices[vertices.length - 2]]
          : [vertices[option.movingIndex - 1], vertices[option.movingIndex + 1]];

  const shapeComposite = newShapeComposite({
    shapes: option.snappableShapes,
    getStruct: option.getShapeStruct,
  });

  function testConnection(point: IVec2, scale: number): ConnectionResult | undefined {
    const threshold = (option.threshold ?? SNAP_THRESHOLD) * scale;

    // Points in a guide line are order sensitive: The first item shouldn't be snapped point.
    // => This assumption is used for snapping to a shape's outline.
    let selfSnapped: { p: IVec2; guidLines: ISegment[] } | undefined;

    // Try snapping to adjacent vertices: On a line.
    if (!option.ignoreCurrentLine && option.movingLine && option.movingIndex !== undefined) {
      const targetVertex = vertices[option.movingIndex];
      const candidates = adjacentVertices.map<[IVec2, ISegment, number]>((adjacent) => {
        const guidLine: ISegment = [targetVertex, adjacent];
        const p = getPedal(point, guidLine);
        return [p, guidLine, getDistance(p, point)];
      });

      const closest = pickMinItem(candidates, (c) => c[2]);
      if (
        closest &&
        closest[2] < threshold &&
        // Exclude vertical or horizontal case that is checked afterwards.
        !isSameValue(closest[1][0].x, closest[1][1].x) &&
        !isSameValue(closest[1][0].y, closest[1][1].y)
      ) {
        selfSnapped = {
          p: closest[0],
          guidLines: [pickLongSegment(closest[1][0], closest[1][1], closest[0])],
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

    // When there're more than one guidlines, snapping point must have been determined.
    if ((selfSnapped?.guidLines.length ?? 0) > 1) return selfSnapped;

    let lineConstrain: { p: IVec2; guidLines: ISegment[]; shapeSnappingResult?: SnappingResult } | undefined;
    let extendedGuideLine: ISegment | undefined;

    if (selfSnapped?.guidLines[0] && !isSame(selfSnapped!.p, selfSnapped.guidLines[0][0])) {
      if (selfSnapped.guidLines.length === 1 && option.shapeSnapping) {
        const snapped = option.shapeSnapping.testPointOnLine(point, selfSnapped.guidLines[0], scale);
        if (snapped) {
          const snappedP = add(point, snapped.diff);
          const connected = snapped.targets
            .map<Shape | undefined>((t) => shapeComposite.shapeMap[t.id])
            .find((s) => s && shapeComposite.isPointOnOutline(s, snappedP));
          if (connected) {
            return {
              connection: {
                rate: shapeComposite.getLocationRateOnShape(connected, snappedP),
                id: connected.id,
              },
              outlineSrc: connected.id,
              p: snappedP,
              guidLines: [pickLongSegment(...selfSnapped.guidLines[0], snappedP)],
            };
          }

          return {
            p: snappedP,
            guidLines: [pickLongSegment(...selfSnapped.guidLines[0], snappedP)],
            shapeSnappingResult: snapped,
          };
        }
      }

      const seg: ISegment = [selfSnapped.guidLines[0][0], selfSnapped.p];
      lineConstrain = selfSnapped;
      extendedGuideLine = extendSegment(seg, 1 + threshold / getDistance(seg[0], seg[1]));
    } else if (!selfSnapped && option.shapeSnapping) {
      // Try to snap to other shapes or girds and pick the closest guideline if exists.
      const snapped = option.shapeSnapping.testPoint(point, scale);
      if (snapped) {
        const snappedP = add(point, snapped.diff);
        const allGuidelines = getGuidelinesFromSnappingResult(snapped, snappedP);
        if (allGuidelines.length > 1) {
          const connected = snapped.targets
            .map<Shape | undefined>((t) => shapeComposite.shapeMap[t.id])
            .find((s) => s && shapeComposite.isPointOnOutline(s, snappedP));
          if (connected) {
            return {
              connection: {
                rate: shapeComposite.getLocationRateOnShape(connected, snappedP),
                id: connected.id,
              },
              p: snappedP,
              outlineSrc: connected.id,
              shapeSnappingResult: snapped,
            };
          }

          return {
            p: snappedP,
            shapeSnappingResult: snapped,
          };
        }

        // Prioritize lines not coming from outline of shapes.
        // => It doesn't work well as a guideline to get a intersection of outline of the shape.
        const [outlineTargets, nonOutlineTargets] = splitList(snapped.targets, (t) => {
          const s = shapeComposite.shapeMap[t.id];
          return s && shapeComposite.isPointOn(s, snappedP);
        });

        let guideline = pickMinItem(
          getGuidelinesFromSnappingResult({
            ...snapped,
            targets: nonOutlineTargets,
          }),
          (seg) => {
            return getD2(sub(point, getPedal(point, seg)));
          },
        );

        if (!guideline && outlineTargets.length > 0) {
          guideline = pickMinItem(
            getGuidelinesFromSnappingResult({
              ...snapped,
              targets: outlineTargets,
              intervalTargets: [],
            }),
            (seg) => {
              return getD2(sub(point, getPedal(point, seg)));
            },
          );
        }

        if (guideline) {
          const guidelineV = sub(guideline[1], guideline[0]);
          if (!isZero(guidelineV)) {
            lineConstrain = {
              p: add(point, snapped.diff),
              guidLines: [],
              shapeSnappingResult: {
                diff: snapped.diff,
                ...filterSnappingTargetsBySecondGuideline(snapped, guideline),
              },
            };
            const v = multi(guidelineV, 1 + threshold / getNorm(guidelineV));
            extendedGuideLine = [sub(guideline[0], v), add(guideline[1], v)];
          }
        }
      }
    }

    // Try snapping to other shapes' outline
    let outline: { p: IVec2; shape: Shape; guideLine?: ISegment; subshape?: Shape } | undefined;
    {
      let outlineThreshold = threshold;

      if (lineConstrain && extendedGuideLine) {
        // Seed the closest intersection between the guideline and shape outline.
        reversedSnappableShapes.forEach((shape) => {
          const candidates = getIntersectedOutlines(
            option.getShapeStruct,
            shape,
            extendedGuideLine[0],
            extendedGuideLine[1],
          );
          const closestCandidate = pickMinItem(candidates ?? [], (c) => getD2(sub(c, point)));
          const d = closestCandidate ? getDistance(closestCandidate, point) : Infinity;

          if (threshold < d && selfSnapped) {
            // When there's no close intersection with self-snapped constraint,
            // check if current point is already on the outline in case the constraint and the outline are parallel.
            const p = getClosestOutline(option.getShapeStruct, shape, lineConstrain.p, MINVALUE, MINVALUE);
            if (p) {
              outlineThreshold = 0;
              outline = { p: lineConstrain.p, shape, guideLine: lineConstrain.guidLines[0] };
            }
            return;
          }

          if (closestCandidate && d < outlineThreshold) {
            outlineThreshold = d;
            outline = { p: closestCandidate, shape, guideLine: lineConstrain.guidLines[0] };
          }
        });
      } else {
        // Set the threshold for markers up to default value, otherwise markers would be too strong.
        const outlineThresholdForMarker = Math.min(SNAP_THRESHOLD * scale, threshold);
        const closeShapes: Shape[] = [];
        reversedSnappableShapes.forEach((shape) => {
          const p = getClosestOutline(
            option.getShapeStruct,
            shape,
            point,
            threshold,
            Math.min(outlineThresholdForMarker, threshold),
          );
          if (!p) {
            // If there's no close outline, check the center.
            const rect = shapeComposite.getWrapperRect(shape);
            const c = getRectCenter(rect);
            const d = getDistance(c, point);
            if (d < outlineThreshold) {
              outlineThreshold = d;
              outline = { p: c, shape };
            }
            return;
          }

          const d = getDistance(p, point);
          if (d < outlineThreshold) {
            if (outline) {
              closeShapes.push(outline.shape);
            }
            outline = { p, shape };
            outlineThreshold = d;
          } else if (d < threshold) {
            closeShapes.push(shape);
          }
        });

        if (outline && closeShapes.length > 0) {
          const outlineP = outline.p;
          const srcOutlinePaths = getOutlinePaths(option.getShapeStruct, outline.shape);
          if (srcOutlinePaths && srcOutlinePaths.length > 0) {
            const srcBeziers = getBezierSegmentList(srcOutlinePaths);
            const candidates: (typeof outline)[] = [];

            closeShapes.forEach((shape) => {
              const outlinePaths = getOutlinePaths(option.getShapeStruct, shape);
              if (!outlinePaths) return;

              const intersections = getBezierIntersections(getBezierSegmentList(outlinePaths), srcBeziers);
              const closestCandidate = pickMinItem(intersections, (p) => getD2(sub(p, point)));
              if (closestCandidate && getDistance(closestCandidate, point) < threshold) {
                candidates.push({ p: closestCandidate, shape });
              }
            });

            const closestCandidate = pickMinItem(candidates ?? [], (c) => getD2(sub(c.p, outlineP)));
            if (closestCandidate) {
              // Pick foward one as main shape.
              // Although this comparison doesn't regard the hierarchy of shapes, it's enough for most cases and efficient.
              if (outline.shape.findex < closestCandidate.shape.findex) {
                outline = { p: closestCandidate.p, shape: closestCandidate.shape, subshape: outline.shape };
              } else {
                outline = { p: closestCandidate.p, shape: outline.shape, subshape: closestCandidate.shape };
              }
            }
          }
        }
      }
    }

    if (outline) {
      const connectionTarget = getConnectedPrimeShape(outline.shape, outline.subshape);
      const connection = connectionTarget
        ? {
            rate: shapeComposite.getLocationRateOnShape(connectionTarget, outline.p),
            id: connectionTarget.id,
          }
        : undefined;

      if (lineConstrain) {
        return {
          connection,
          p: outline.p,
          outlineSrc: outline.shape.id,
          guidLines: lineConstrain.guidLines.map((g) => pickLongSegment(g[0], g[1], outline!.p)),
          shapeSnappingResult: lineConstrain.shapeSnappingResult
            ? {
                ...lineConstrain.shapeSnappingResult,
                ...optimizeSnappingTargetInfoForPoint(lineConstrain.shapeSnappingResult, outline.p),
              }
            : undefined,
        };
      }

      return {
        connection,
        p: outline.p,
        outlineSrc: outline.shape.id,
        outlineSubSrc: outline.subshape?.id,
        guidLines: outline.guideLine ? [outline.guideLine] : undefined,
      };
    }

    const snapped = lineConstrain ?? selfSnapped;
    if (snapped) {
      // Check if the snapped point is on the outline of the shape.
      // When a guideline is parallel to the outline, their intersection isn't found up to this point.
      const connectionTarget = reversedSnappableShapes.find((shape) => {
        return !isLineShape(shape) && !!getClosestOutline(option.getShapeStruct, shape, snapped.p, MINVALUE, MINVALUE);
      });
      return connectionTarget
        ? {
            ...snapped,
            connection: {
              rate: shapeComposite.getLocationRateOnShape(connectionTarget, snapped.p),
              id: connectionTarget.id,
            },
            outlineSrc: connectionTarget.id,
          }
        : snapped;
    }

    return;
  }

  return { testConnection };
}
export type LineSnapping = ReturnType<typeof newLineSnapping>;

function getConnectedPrimeShape(main?: Shape, sub?: Shape): Shape | undefined {
  const connectionTarget1 = main && !isLineShape(main) ? main : undefined;
  const connectionTarget2 = sub && !isLineShape(sub) ? sub : undefined;
  return connectionTarget1 ?? connectionTarget2;
}

function getBezierIntersections(
  beziers: ([IVec2, IVec2] | [IVec2, IVec2, IVec2, IVec2])[],
  srcBeziers: ([IVec2, IVec2] | [IVec2, IVec2, IVec2, IVec2])[],
): IVec2[] {
  const intersections: IVec2[] = [];
  beziers.forEach((path) => {
    srcBeziers.forEach((srcPath) => {
      if (path.length === 4 && srcPath.length === 4) {
        intersections.push(...getCrossBezier3AndBezier3(srcPath, path));
      } else if (path.length === 2 && srcPath.length === 4) {
        intersections.push(...getCrossSegAndBezier3(path, srcPath));
      } else if (path.length === 4 && srcPath.length === 2) {
        intersections.push(...getCrossSegAndBezier3(srcPath, path));
      } else if (path.length === 2 && srcPath.length === 2) {
        const intersection = getCrossSegAndSeg(srcPath, path);
        if (intersection) intersections.push(intersection);
      }
    });
  });
  return intersections;
}

export function renderConnectionResult(
  ctx: CanvasCTX,
  option: {
    result: ConnectionResult;
    scale: number;
    style: StyleScheme;
    shapeComposite: ShapeComposite;
  },
) {
  const shapeComposite = option.shapeComposite;
  const getTargetRect = (id: string) =>
    shapeComposite.shapeMap[id] ? shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]) : undefined;

  if (option.result.shapeSnappingResult) {
    renderSnappingResult(ctx, {
      result: option.result.shapeSnappingResult,
      getTargetRect,
      scale: option.scale,
      style: option.style,
    });
  }

  const highlightShape = (id: string) => {
    const shape = shapeComposite.shapeMap[id];
    if (!shape) return;

    const outlinePaths = getOutlinePaths(option.shapeComposite.getShapeStruct, shape);
    if (outlinePaths && outlinePaths.length > 0) {
      applyStrokeStyle(ctx, { color: option.style.selectionSecondaly });
      ctx.beginPath();
      outlinePaths.forEach((path) => {
        applyCurvePath(ctx, path.path, path.curves);
      });
      applyStrokeStyle(ctx, {
        color: option.style.selectionSecondaly,
        width: 2 * option.scale,
      });
      ctx.stroke();
    } else {
      const rect = option.shapeComposite.getWrapperRect(shape);
      scaleGlobalAlpha(ctx, 0.2, () => {
        applyFillStyle(ctx, { color: option.style.selectionSecondaly });
        ctx.beginPath();
        ctx.rect(rect.x, rect.y, rect.width, rect.height);
        ctx.fill();
      });
    }
  };

  if (option.result.outlineSrc) highlightShape(option.result.outlineSrc);
  if (option.result.outlineSubSrc) highlightShape(option.result.outlineSubSrc);

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

  const shapeMap = shapeComposite.shapeMap;
  const shapeP = lineShape.pConnection ? shapeMap[lineShape.pConnection.id] : undefined;
  const shapeQ = lineShape.qConnection ? shapeMap[lineShape.qConnection.id] : undefined;

  if (shapeP && lineShape.pConnection?.optimized) {
    if (shapeQ && lineShape.qConnection?.optimized) {
      if (vertices.length === 2 || elbow) {
        const seg = getOptimizedSegment(shapeComposite, shapeP, shapeQ);
        if (!seg) return;

        const [p, q] = seg;
        const patchP: Partial<LineShape> = isSame(p, lineShape.p)
          ? {}
          : {
              p,
              pConnection: {
                ...lineShape.pConnection,
                rate: shapeComposite.getLocationRateOnShape(shapeP, p),
              },
            };
        const patchQ: Partial<LineShape> = isSame(q, lineShape.q)
          ? {}
          : {
              q,
              qConnection: {
                ...lineShape.qConnection,
                rate: shapeComposite.getLocationRateOnShape(shapeQ, q),
              },
            };
        const ret = { ...patchP, ...patchQ };
        return Object.keys(ret).length > 0 ? ret : undefined;
      }
    }
  }

  const ret: Partial<LineShape> = {};

  if (shapeP && lineShape.pConnection?.optimized) {
    const seg = getOptimizedSegmentBetweenShapeAndPoint(shapeComposite, shapeP, vertices[1]);
    if (!seg) return;

    const p = seg[0];
    if (!isSame(p, lineShape.p)) {
      ret.p = p;
      ret.pConnection = {
        ...lineShape.pConnection,
        rate: shapeComposite.getLocationRateOnShape(shapeP, p),
      };
    }
  }

  if (shapeQ && lineShape.qConnection?.optimized) {
    const seg = getOptimizedSegmentBetweenShapeAndPoint(shapeComposite, shapeQ, vertices[vertices.length - 2]);
    if (!seg) return;

    const q = seg[0];
    if (!isSame(q, lineShape.q)) {
      ret.q = q;
      ret.qConnection = {
        ...lineShape.qConnection,
        rate: shapeComposite.getLocationRateOnShape(shapeQ, q),
      };
    }
  }

  if (!shapeP && lineShape.pConnection) {
    ret.pConnection = undefined;
  }
  if (!shapeQ && lineShape.qConnection) {
    ret.qConnection = undefined;
  }

  return Object.keys(ret).length > 0 ? ret : undefined;
}

export function isLineSnappableShape(shapeComposite: ShapeComposite, shape: Shape): boolean {
  return !isLineLabelShape(shapeComposite, shape) && !isGroupShape(shape);
}

export function patchLinesConnectedToShapeOutline(
  shapeComposite: ShapeComposite,
  shape: Shape,
): { [id: string]: Partial<LineShape> } {
  const shapeMap = shapeComposite.shapeMap;
  const lines = Object.values(shapeMap).filter(isLineShape);

  const ret: { [id: string]: Partial<LineShape> } = {};
  lines.forEach((line) => {
    const patch = patchLineConnectedToShapeOutline(shapeComposite, shape, line);
    if (isObjectEmpty(patch)) return;
    ret[line.id] = patch;
  });
  return ret;
}

function patchLineConnectedToShapeOutline(
  shapeComposite: ShapeComposite,
  shape: Shape,
  line: LineShape,
): Partial<LineShape> {
  const pConnection = line.pConnection;
  const qConnection = line.qConnection;
  const shouldCheckP = shouldReconnectToOutline(shapeComposite, shape.id, pConnection);
  const shouldCheckQ = shouldReconnectToOutline(shapeComposite, shape.id, qConnection);
  if (!shouldCheckP && !shouldCheckQ) return {};

  const points = getLinePath(line);
  const ret: Partial<LineShape> = {};

  if (shouldCheckP) {
    const intersection = getClosestEndPoint(shapeComposite.getShapeStruct, shape, [points[1], points[0]]);
    if (intersection) {
      const rate = shapeComposite.getLocationRateOnShape(shape, intersection);
      ret.pConnection = { ...pConnection, rate };
      ret.p = intersection;
    }
  }

  if (shouldCheckQ) {
    const intersection = getClosestEndPoint(shapeComposite.getShapeStruct, shape, [
      points[points.length - 2],
      points[points.length - 1],
    ]);
    if (intersection) {
      const rate = shapeComposite.getLocationRateOnShape(shape, intersection);
      ret.qConnection = { ...qConnection, rate };
      ret.q = intersection;
    }
  }

  return ret;
}

function shouldReconnectToOutline(
  shapeComposite: ShapeComposite,
  shapeId: string,
  connection?: ConnectionPoint,
): connection is ConnectionPoint {
  if (connection?.id !== shapeId) return false;
  if (isConnectedToCenter(connection) || connection.optimized) return false;

  // Check if the connection point is on the outline.
  const shape = shapeComposite.shapeMap[shapeId];
  const rectPath = shapeComposite.getLocalRectPolygon(shape);
  const p = getLocationFromRateOnRectPath(rectPath, shape.rotation, connection.rate);
  // Set the threshold a bit loose.
  // Whether the connection should be reconnected or not isn't always obvious either way.
  const closestOutline = getClosestOutline(shapeComposite.getShapeStruct, shape, p, 0.01);
  return !!closestOutline;
}

/**
 * Returns the closest intersection on the segment.
 * - Picks the closest one to the original point when there're multiple candidates.
 *   This one isn't always the best but it keeps better consistency and reversability.
 * Returns nothing when there's no intersection.
 * - It might be well to ignore the segment and return the closest point to the outline,
 *   but it would greatly ruin reversability of this operation.
 */
function getClosestEndPoint(getShapeStruct: GetShapeStruct, shape: Shape, seg: ISegment): IVec2 | undefined {
  const originalEndPoint = seg[1];
  const extendedSeg = extendSegment(seg, 10);
  return getClosestPointTo(
    originalEndPoint,
    getIntersectedOutlines(getShapeStruct, shape, extendedSeg[0], extendedSeg[1]) ?? [],
  );
}

function getBezierSegmentList(beziers: BezierPath[]): ([IVec2, IVec2, IVec2, IVec2] | [IVec2, IVec2])[] {
  const ret: ([IVec2, IVec2, IVec2, IVec2] | [IVec2, IVec2])[] = [];
  beziers.forEach((path) => {
    path.path.forEach((p, i) => {
      if (i === path.path.length - 1) return;
      const c = path.curves[i];
      ret.push(c ? [p, c.c1, c.c2, path.path[i + 1]] : [p, path.path[i + 1]]);
    });
  });
  return ret;
}
