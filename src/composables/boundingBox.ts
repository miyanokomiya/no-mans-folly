import {
  AffineMatrix,
  IVec2,
  add,
  applyAffine,
  getCenter,
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
import { isPointCloseToSegment } from "../utils/geometry";
import { newCircleHitTest } from "./shapeHitTest";

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
  const rotation = tl.x === tr.x ? 0 : getRadian(tr, tl);
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
      c: multi(add(tr, rotate({ x: 20, y: -20 }, rotation)), scale),
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
    applyStrokeStyle(ctx, { color: style.selectionPrimary });
    ctx.lineWidth = 2;
    ctx.fillStyle = "#fff";

    function resize(p: IVec2): IVec2 {
      return resizingAffine ? applyAffine(resizingAffine, p) : p;
    }

    ctx.beginPath();
    applyPath(ctx, option.path.map(resize), true);
    ctx.stroke();

    if (!resizingAffine) {
      anchors.forEach((anchor, i) => {
        const diff = sub(resize(option.path[i]), option.path[i]);
        ctx.beginPath();
        applyPath(
          ctx,
          anchor.map((p) => add(p, diff)),
          true
        );
        ctx.fill();
        ctx.stroke();
      });

      ctx.beginPath();
      ctx.arc(rotationAnchor.c.x, rotationAnchor.c.y, rotationAnchor.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  function getCursorStyle(hitBounding: HitResult): string | undefined {
    if (!hitBounding) return;

    switch (hitBounding.type) {
      case "corner":
        return hitBounding.index % 2 === 0 ? "nwse-resize" : "nesw-resize";
      case "segment":
        return hitBounding.index % 2 === 0 ? "ns-resize" : "ew-resize";
      case "rotation":
        return "grab";
      default:
        return;
    }
  }

  function getResizingBase(hitResult: HitResult): ResizingBase {
    return _getResizingBase(option.path, hitResult);
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
  };
}
export type BoundingBox = ReturnType<typeof newBoundingBox>;

interface BoundingBoxResizingOption {
  rotation: number;
  hitResult: HitResult;
  resizingBase: ResizingBase;
}

export function newBoundingBoxResizing(option: BoundingBoxResizingOption) {
  const isIndexOdd = option.hitResult.index % 2 === 0;
  const isCorner = option.hitResult.type === "corner";
  const xResizable = isCorner || !isIndexOdd;
  const yResizable = isCorner || isIndexOdd;

  const sin = Math.sin(option.rotation);
  const cos = Math.cos(option.rotation);
  const rotatedBaseDirection = rotate(option.resizingBase.direction, -option.rotation);

  const centralizedOrigin = add(option.resizingBase.origin, multi(option.resizingBase.direction, 1 / 2));
  const centralizedrotatedBaseDirection = multi(rotatedBaseDirection, 1 / 2);

  function getResizingAffine(diff: IVec2, modifire?: { keepAspect?: boolean; centralize?: boolean }): AffineMatrix {
    const keepAspect = modifire?.keepAspect;
    const centralize = modifire?.centralize;

    const adjustedRotatedDirection = centralize ? centralizedrotatedBaseDirection : rotatedBaseDirection;
    const adjustedDiff = keepAspect ? getPedal(diff, [option.resizingBase.direction, { x: 0, y: 0 }]) : diff;
    const rotatedDiff = rotate(adjustedDiff, -option.rotation);
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

  return { getResizingAffine };
}

interface BoundingBoxRotatingOption {
  rotation: number;
  origin: IVec2;
}

export function newBoundingBoxRotating(option: BoundingBoxRotatingOption) {
  const sin = Math.sin(option.rotation);
  const cos = Math.cos(option.rotation);

  function getAffine(start: IVec2, current: IVec2): AffineMatrix {
    const startR = getRadian(start, option.origin);
    const targetR = getRadian(current, option.origin);
    const dr = targetR - startR;
    const dsin = Math.sin(dr);
    const dcos = Math.cos(dr);

    return multiAffines([
      [1, 0, 0, 1, option.origin.x, option.origin.y],
      [cos, sin, -sin, cos, 0, 0],
      [dcos, dsin, -dsin, dcos, 0, 0],
      [cos, -sin, sin, cos, 0, 0],
      [1, 0, 0, 1, -option.origin.x, -option.origin.y],
    ]);
  }

  return { getAffine };
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
