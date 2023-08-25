import {
  AffineMatrix,
  IVec2,
  add,
  applyAffine,
  getCenter,
  getRadian,
  isOnPolygon,
  multiAffines,
  rotate,
  sub,
} from "okageo";
import { applyPath } from "../utils/renderer";
import { StyleScheme } from "../models";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { isPointCloseToSegment } from "../utils/geometry";

const ANCHOR_SIZE = 5;

type HitType = "corner" | "segment" | "area";
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
}

export function newBoundingBox(option: Option) {
  const [tl, tr, br, bl] = option.path;
  const rotation = tl.x === tr.x ? 0 : getRadian(tr, tl);

  const anchors = option.path.map((p) => {
    const x0 = p.x - ANCHOR_SIZE;
    const x1 = p.x + ANCHOR_SIZE;
    const y0 = p.y - ANCHOR_SIZE;
    const y1 = p.y + ANCHOR_SIZE;
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

  const segments = [
    [tl, tr],
    [tr, br],
    [br, bl],
    [bl, tl],
  ];

  function hitTest(p: IVec2): HitResult | undefined {
    const cornerIndex = anchors.findIndex((a) => isOnPolygon(p, a));
    if (cornerIndex > -1) {
      return { type: "corner", index: cornerIndex };
    }

    const segIndex = segments.findIndex((s) => isPointCloseToSegment(s, p, ANCHOR_SIZE));
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
  }

  function getResizingBase(hitResult: HitResult): ResizingBase {
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

  return {
    path: option.path,
    getRotation: () => rotation,
    hitTest,
    render,
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
  const xResizable =
    (option.hitResult.type === "segment" && option.hitResult.index % 2 === 1) || option.hitResult.type === "corner";
  const yResizable =
    (option.hitResult.type === "segment" && option.hitResult.index % 2 === 0) || option.hitResult.type === "corner";

  const sin = Math.sin(option.rotation);
  const cos = Math.cos(option.rotation);
  const rotatedBaseDirection = rotate(option.resizingBase.direction, -option.rotation);

  function getResizingAffine(diff: IVec2): AffineMatrix {
    const rotatedDiff = rotate(diff, -option.rotation);
    const rotatedScale = {
      x: xResizable ? 1 + rotatedDiff.x / rotatedBaseDirection.x : 1,
      y: yResizable ? 1 + rotatedDiff.y / rotatedBaseDirection.y : 1,
    };
    return multiAffines([
      [1, 0, 0, 1, option.resizingBase.origin.x, option.resizingBase.origin.y],
      [cos, sin, -sin, cos, 0, 0],
      [rotatedScale.x, 0, 0, rotatedScale.y, 0, 0],
      [cos, -sin, sin, cos, 0, 0],
      [1, 0, 0, 1, -option.resizingBase.origin.x, -option.resizingBase.origin.y],
    ]);
  }

  return { getResizingAffine };
}
