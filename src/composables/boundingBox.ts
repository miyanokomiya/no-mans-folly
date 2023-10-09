import {
  AffineMatrix,
  IVec2,
  add,
  applyAffine,
  getCenter,
  getDistance,
  getNorm,
  getPedal,
  getRadian,
  isOnPolygon,
  multi,
  multiAffines,
  rotate,
  sub,
} from "okageo";
import { applyPath } from "../utils/renderer";
import { StyleScheme } from "../models";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { ISegment, TAU, getCrossLineAndLine, getRotateFn, isPointCloseToSegment, snapAngle } from "../utils/geometry";
import { newCircleHitTest } from "./shapeHitTest";
import { getResizingCursorStyle } from "../utils/styleHelper";

const ANCHOR_SIZE = 5;

type HitType = "rotation" | "corner" | "segment" | "area";
export interface HitResult {
  type: HitType;
  index: number;
}

interface ResizingBase {
  origin: IVec2;
  direction: IVec2;
}

interface Option {
  path: IVec2[];
  styleScheme: StyleScheme;
  scale?: number;
}

export function newBoundingBox(option: Option) {
  const [tl, tr, br, bl] = option.path;
  const rotation = getRadian(tr, tl);
  const center = getCenter(tl, br);

  const segments = [
    [tl, tr],
    [tr, br],
    [br, bl],
    [bl, tl],
  ];

  let scale = option.scale ?? 1;
  let scaledAnchorSize = ANCHOR_SIZE * scale;
  let anchors = getAnchors();
  let rotationAnchor = getRotationAnchor();

  function updateScale(val: number) {
    scale = val;
    scaledAnchorSize = ANCHOR_SIZE * scale;
    anchors = getAnchors();
    rotationAnchor = getRotationAnchor();
  }

  function getAnchors(): IVec2[][] {
    return option.path.map((p) => {
      const x0 = p.x - scaledAnchorSize;
      const x1 = p.x + scaledAnchorSize;
      const y0 = p.y - scaledAnchorSize;
      const y1 = p.y + scaledAnchorSize;
      const rect = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];

      if (rotation === 0) return rect;

      const c = getCenter(rect[0], rect[2]);
      return rect.map((q) => rotate(q, rotation, c));
    });
  }

  function getRotationAnchor(): { c: IVec2; r: number } {
    return {
      c: add(tr, multi(rotate({ x: 20, y: -20 }, rotation), scale)),
      r: scaledAnchorSize * 2,
    };
  }

  function hitTest(p: IVec2): HitResult | undefined {
    const rotationHitTest = newCircleHitTest(rotationAnchor.c, rotationAnchor.r);
    if (rotationHitTest.test(p)) {
      return { type: "rotation", index: 0 };
    }

    const cornerIndex = anchors.findIndex((a) => isOnPolygon(p, a));
    if (cornerIndex > -1) {
      return { type: "corner", index: cornerIndex };
    }

    const segIndex = segments.findIndex((s) => isPointCloseToSegment(s, p, scaledAnchorSize));
    if (segIndex > -1) {
      return { type: "segment", index: segIndex };
    }

    if (isOnPolygon(p, option.path)) {
      return { type: "area", index: 0 };
    }
  }

  function render(ctx: CanvasRenderingContext2D, resizingAffine?: AffineMatrix) {
    const style = option.styleScheme;
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
    ctx.fillStyle = "#fff";

    function resize(p: IVec2): IVec2 {
      return resizingAffine ? applyAffine(resizingAffine, p) : p;
    }

    ctx.beginPath();
    applyPath(ctx, option.path.map(resize), true);
    ctx.stroke();

    if (!resizingAffine) {
      ctx.lineWidth = 2 * scale;
      anchors.forEach((anchor, i) => {
        const diff = sub(resize(option.path[i]), option.path[i]);
        ctx.beginPath();
        applyPath(
          ctx,
          anchor.map((p) => add(p, diff)),
          true,
        );
        ctx.fill();
        ctx.stroke();
      });

      ctx.beginPath();
      ctx.arc(rotationAnchor.c.x, rotationAnchor.c.y, rotationAnchor.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }

  function getCursorStyle(hitBounding: HitResult): string | undefined {
    if (!hitBounding) return;

    switch (hitBounding.type) {
      case "corner": {
        const r = hitBounding.index % 2 === 0 ? Math.PI / 4 : -Math.PI / 4;
        return getResizingCursorStyle(r + rotation);
      }
      case "segment": {
        const r = hitBounding.index % 2 === 0 ? Math.PI / 2 : 0;
        return getResizingCursorStyle(r + rotation);
      }
      case "rotation":
        return "grab";
      default:
        return;
    }
  }

  function getResizingBase(hitResult: HitResult): ResizingBase {
    return _getResizingBase(option.path, hitResult);
  }

  function getTransformedBoundingBox(affine: AffineMatrix): BoundingBox {
    return newBoundingBox({
      path: option.path.map((p) => applyAffine(affine, p)),
      styleScheme: option.styleScheme,
      scale,
    });
  }

  return {
    updateScale,
    path: option.path,
    getRotation: () => rotation,
    getCenter: () => center,
    hitTest,
    render,
    getCursorStyle,
    getResizingBase,
    getTransformedBoundingBox,
  };
}
export type BoundingBox = ReturnType<typeof newBoundingBox>;

const MINIMUM_SIZE = 10;

interface BoundingBoxResizingOption {
  rotation: number;
  hitResult: HitResult;
  resizingBase: ResizingBase;
  mode?: "text";
}

export function newBoundingBoxResizing(option: BoundingBoxResizingOption) {
  const isIndexOdd = option.hitResult.index % 2 === 0;
  const isCorner = option.hitResult.type === "corner";
  const isSegment = option.hitResult.type === "segment";
  const xResizable = isCorner || !isIndexOdd;
  const yResizable = isCorner || isIndexOdd;

  const sin = Math.sin(option.rotation);
  const cos = Math.cos(option.rotation);
  const rotatedBaseDirection = rotate(option.resizingBase.direction, -option.rotation);

  const centralizedOrigin = add(option.resizingBase.origin, multi(option.resizingBase.direction, 1 / 2));
  const centralizedrotatedBaseDirection = multi(rotatedBaseDirection, 1 / 2);

  const rotateFn = getRotateFn(-option.rotation, centralizedOrigin);
  const rotatedBaseOrigin = rotateFn(option.resizingBase.origin);

  // In "text" mode,
  // - cannot be resized vertically
  // - can be resized horizontally
  // - can be resized proportionally
  const keepAspectForce = option.mode === "text" && yResizable;

  function getAffine(diff: IVec2, modifire?: { keepAspect?: boolean; centralize?: boolean }): AffineMatrix {
    const keepAspect = keepAspectForce || modifire?.keepAspect;
    const centralize = modifire?.centralize;

    const adjustedRotatedDirection = centralize ? centralizedrotatedBaseDirection : rotatedBaseDirection;
    const adjustedDiff = keepAspect ? getPedal(diff, [option.resizingBase.direction, { x: 0, y: 0 }]) : diff;
    let rotatedDiff = rotate(adjustedDiff, -option.rotation);

    // Avoid scaling down to much
    {
      const signX = Math.sign(adjustedRotatedDirection.x);
      const signY = Math.sign(adjustedRotatedDirection.y);
      const resizedDirection = add(rotatedDiff, adjustedRotatedDirection);
      const miniSize = centralize ? MINIMUM_SIZE / 2 : MINIMUM_SIZE;
      rotatedDiff = {
        x: resizedDirection.x * signX < miniSize ? miniSize * signX - adjustedRotatedDirection.x : rotatedDiff.x,
        y: resizedDirection.y * signY < miniSize ? miniSize * signY - adjustedRotatedDirection.y : rotatedDiff.y,
      };
    }

    const rotatedScale = {
      x: xResizable ? 1 + rotatedDiff.x / adjustedRotatedDirection.x : 1,
      y: yResizable ? 1 + rotatedDiff.y / adjustedRotatedDirection.y : 1,
    };

    const adjustedRotatedScale = !keepAspect
      ? rotatedScale
      : xResizable
      ? { x: rotatedScale.x, y: rotatedScale.x }
      : { x: rotatedScale.y, y: rotatedScale.y };

    const adjustedOrigin = centralize ? centralizedOrigin : option.resizingBase.origin;

    return multiAffines([
      [1, 0, 0, 1, adjustedOrigin.x, adjustedOrigin.y],
      [cos, sin, -sin, cos, 0, 0],
      [adjustedRotatedScale.x, 0, 0, adjustedRotatedScale.y, 0, 0],
      [cos, -sin, sin, cos, 0, 0],
      [1, 0, 0, 1, -adjustedOrigin.x, -adjustedOrigin.y],
    ]);
  }

  function getAffineAfterSnapping(
    diff: IVec2,
    movingPointInfoList: [src: IVec2, snapped: IVec2][],
    snappedSegment: ISegment,
    modifire?: { keepAspect?: boolean; centralize?: boolean },
  ): [affine: AffineMatrix, d: number, exactTarget?: ISegment] {
    const keepAspect = keepAspectForce || modifire?.keepAspect;
    const centralize = modifire?.centralize;

    // If the anchor point can move freely, the resizing can be treated as normal.
    // If not, the anchor point has to move along certain guide line.
    if (!keepAspect && isCorner) return [getAffine(diff, modifire), 0];

    const KeepAspectSegment = keepAspect && isSegment;
    const rotatedSegment = snappedSegment.map((p) => rotateFn(p));
    const adjustedRotatedDirection = centralize ? centralizedrotatedBaseDirection : rotatedBaseDirection;

    let rate: number | undefined;
    let distance: number | undefined;
    let movingPointInfo: [IVec2, IVec2] | undefined;
    movingPointInfoList.forEach(([p, snappedP]) => {
      const rotatedP = rotateFn(p);

      // There are three kinds of guide lines depending on resizing anchor type and modifire.
      // 1. When the anchor is corner and keepAspect, the guide line is diagonal ones.
      // 2. When the anchor is segment and keepAspect, the guide line is from the center of origin segment to the opposite corners.
      // 3. When the anchor is segment and not keepAspect, the guide line is the bisector of the segment.
      const adjustedRotatedOrigin = KeepAspectSegment
        ? centralize
          ? centralizedOrigin
          : rotatedBaseOrigin
        : sub(rotatedP, adjustedRotatedDirection);
      const direction = KeepAspectSegment ? sub(rotatedP, adjustedRotatedOrigin) : adjustedRotatedDirection;
      const targetSeg = [adjustedRotatedOrigin, rotatedP];
      const pedalRotatedMovedP = getPedal(rotateFn(snappedP), targetSeg);

      const cross = getCrossLineAndLine(rotatedSegment, targetSeg);
      if (cross) {
        const d = getDistance(cross, pedalRotatedMovedP);
        const r = getNorm(sub(cross, adjustedRotatedOrigin)) / getNorm(direction);
        if (rate === undefined || distance === undefined || d <= distance) {
          rate = r;
          distance = d;
          movingPointInfo = [p, snappedP];
        }
      }
    });
    if (rate === undefined || !movingPointInfo) {
      return [getAffine(diff, modifire), 0];
    }

    const adjustedOrigin = centralize ? centralizedOrigin : option.resizingBase.origin;
    const affine = multiAffines([
      [1, 0, 0, 1, adjustedOrigin.x, adjustedOrigin.y],
      [cos, sin, -sin, cos, 0, 0],
      [keepAspect || xResizable ? rate : 1, 0, 0, keepAspect || yResizable ? rate : 1, 0, 0],
      [cos, -sin, sin, cos, 0, 0],
      [1, 0, 0, 1, -adjustedOrigin.x, -adjustedOrigin.y],
    ]);
    return [affine, getDistance(movingPointInfo[1], applyAffine(affine, movingPointInfo[0])), snappedSegment];
  }

  function getTransformedAnchor(affine: AffineMatrix): IVec2 {
    return applyAffine(affine, add(option.resizingBase.origin, option.resizingBase.direction));
  }

  return { getAffine, getAffineAfterSnapping, getTransformedAnchor };
}
export type BoundingBoxResizing = ReturnType<typeof newBoundingBoxResizing>;

interface BoundingBoxRotatingOption {
  rotation: number;
  origin: IVec2;
}

export function newBoundingBoxRotating(option: BoundingBoxRotatingOption) {
  const sin = Math.sin(option.rotation);
  const cos = Math.cos(option.rotation);
  const m0 = multiAffines([
    [1, 0, 0, 1, option.origin.x, option.origin.y],
    [cos, sin, -sin, cos, 0, 0],
  ]);
  const m1 = multiAffines([
    [cos, -sin, sin, cos, 0, 0],
    [1, 0, 0, 1, -option.origin.x, -option.origin.y],
  ]);

  function getAffine(start: IVec2, current: IVec2, snap = false): AffineMatrix {
    const startR = getRadian(start, option.origin);
    const targetR = getRadian(current, option.origin);
    const dr = targetR - startR;

    if (snap) {
      const r = (snapAngle(((dr + option.rotation) * 180) / Math.PI, 15) * Math.PI) / 180 - option.rotation;
      const dsin = Math.sin(r);
      const dcos = Math.cos(r);
      return multiAffines([m0, [dcos, dsin, -dsin, dcos, 0, 0], m1]);
    }

    const adjusted0 = (snapAngle(((dr + option.rotation) * 180) / Math.PI, 5) * Math.PI) / 180 - option.rotation;
    const adjusted1 = (snapAngle(((dr + option.rotation) * 180) / Math.PI, 45) * Math.PI) / 180 - option.rotation;
    const r = Math.abs(adjusted0 - adjusted1) < 0.0001 ? adjusted0 : dr;
    const dsin = Math.sin(r);
    const dcos = Math.cos(r);

    return multiAffines([m0, [dcos, dsin, -dsin, dcos, 0, 0], m1]);
  }

  return { getAffine };
}
export type BoundingBoxRotating = ReturnType<typeof newBoundingBoxRotating>;

export function getMovingBoundingBoxPoints(boundingBoxPath: IVec2[], hitResult: HitResult): IVec2[] {
  return hitResult.type === "corner"
    ? [boundingBoxPath[hitResult.index]]
    : hitResult.type === "segment"
    ? [boundingBoxPath[hitResult.index], boundingBoxPath[(hitResult.index + 1) % 4]]
    : [];
}

function _getResizingBase([tl, tr, br, bl]: IVec2[], hitResult: HitResult): ResizingBase {
  if (hitResult.type === "segment") {
    if (hitResult.index === 0) {
      return {
        direction: sub(tl, bl),
        origin: getCenter(bl, br),
      };
    } else if (hitResult.index === 1) {
      return {
        direction: sub(tr, tl),
        origin: getCenter(tl, bl),
      };
    } else if (hitResult.index === 2) {
      return {
        direction: sub(bl, tl),
        origin: getCenter(tl, tr),
      };
    } else {
      return {
        direction: sub(tl, tr),
        origin: getCenter(tr, br),
      };
    }
  } else if (hitResult.type === "corner") {
    if (hitResult.index === 0) {
      return {
        direction: sub(tl, br),
        origin: br,
      };
    } else if (hitResult.index === 1) {
      return {
        direction: sub(tr, bl),
        origin: bl,
      };
    } else if (hitResult.index === 2) {
      return {
        direction: sub(br, tl),
        origin: tl,
      };
    } else {
      return {
        direction: sub(bl, tr),
        origin: tr,
      };
    }
  } else {
    throw new Error("Not implemented");
  }
}
