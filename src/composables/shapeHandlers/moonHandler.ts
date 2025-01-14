import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, applyPath, renderOutlinedCircle } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { MoonShape, getMoonInsetLocalX, getMoonRadius } from "../../shapes/moon";
import { CanvasCTX } from "../../utils/types";

export const ANCHOR_SIZE = 6;
export const ANCHOR_MARGIN = 16;

type HitAnchor = [type: "innsetC" | "radiusRate", IVec2];

interface HitResult {
  type: HitAnchor[0];
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newMoonHandler = defineShapeHandler<HitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as MoonShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.rx * 2, height: shape.ry * 2 };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  function getAnchors(): HitAnchor[] {
    return [
      ["innsetC", getMoonInnsetLocalControl(shape)],
      ["radiusRate", getMoonRadiusLocalControl(shape)],
    ];
  }

  function hitTest(p: IVec2, scale = 1): HitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const anchors = getAnchors();
    const adjustedP = sub(rotateFn(p, true), shape.p);

    const hit = anchors.find((a) => getDistance(a[1], adjustedP) <= threshold);
    if (hit) {
      return { type: hit[0] };
    }
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: HitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const anchors = getAnchors();

    renderMoonOutline(ctx, style, scale, shape);

    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      anchors
        .map<[IVec2, boolean]>((a) => [a[1], a[0] === hitResult?.type])
        .forEach(([p, highlight]) => {
          if (highlight) {
            renderOutlinedCircle(ctx, p, threshold, style.selectionSecondaly);
          } else {
            renderOutlinedCircle(ctx, p, threshold, style.transformAnchor);
          }
        });
    });
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      return a?.type === b?.type;
    },
  };
});
export type MoonHandler = ReturnType<typeof newMoonHandler>;

export function renderMoonOutline(ctx: CanvasCTX, style: StyleScheme, scale: number, shape: MoonShape) {
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.rx * 2, height: shape.ry * 2 };
  applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
    applyStrokeStyle(ctx, { color: style.selectionSecondaly, dash: "dot", width: 4 * scale });
    const brx = getMoonRadius(shape);
    const bry = (brx / shape.rx) * shape.ry;
    const bc = { x: getMoonInsetLocalX(shape) + brx, y: shape.ry };
    ctx.beginPath();
    ctx.ellipse(bc.x, bc.y, brx, bry, 0, 0, TAU);
    ctx.stroke();
  });
}

export function renderShapeBounds(ctx: CanvasCTX, style: StyleScheme, path: IVec2[]) {
  applyStrokeStyle(ctx, { color: style.selectionPrimary });
  ctx.beginPath();
  applyPath(ctx, path, true);
  ctx.stroke();
}

export function getMoonInnsetLocalControl(shape: MoonShape): IVec2 {
  return { x: getMoonInsetLocalX(shape), y: shape.ry };
}

export function getMoonRadiusLocalControl(shape: MoonShape): IVec2 {
  const radius = getMoonRadius(shape);
  return { x: getMoonInsetLocalX(shape) + radius, y: shape.ry - (radius / shape.rx) * shape.ry };
}
