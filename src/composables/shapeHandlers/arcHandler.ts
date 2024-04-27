import { IVec2, add, getDistance, getRectCenter, multi, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { TAU, getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, applyPath, renderOutlinedCircle } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { ArcShape } from "../../shapes/arc";

export const ANCHOR_SIZE = 6;

type HitAnchor = [type: "from" | "to", IVec2];

interface HitResult {
  type: string;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newArcHandler = defineShapeHandler<HitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as ArcShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.rx * 2, height: shape.ry * 2 };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  function getAnchors(): HitAnchor[] {
    return [
      ["from", getArcFromLocalControl(shape)],
      ["to", getArcToLocalControl(shape)],
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

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: HitResult) {
    const threshold = ANCHOR_SIZE * scale;
    const anchors = getAnchors();

    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, dash: "dot", width: 4 * scale });
      ctx.beginPath();
      ctx.ellipse(shape.rx, shape.ry, shape.rx, shape.ry, 0, 0, TAU);
      ctx.stroke();

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
export type ArcHandler = ReturnType<typeof newArcHandler>;

export function renderShapeBounds(ctx: CanvasRenderingContext2D, style: StyleScheme, path: IVec2[]) {
  applyStrokeStyle(ctx, { color: style.selectionPrimary });
  ctx.beginPath();
  applyPath(ctx, path, true);
  ctx.stroke();
}

export function getArcFromLocalControl(shape: ArcShape): IVec2 {
  return add(
    { x: shape.rx, y: shape.ry },
    multi({ x: Math.cos(shape.from) * shape.rx, y: Math.sin(shape.from) * shape.ry }, 0.5),
  );
}

export function getArcToLocalControl(shape: ArcShape): IVec2 {
  return add(
    { x: shape.rx, y: shape.ry },
    multi({ x: Math.cos(shape.to) * shape.rx, y: Math.sin(shape.to) * shape.ry }, 0.8),
  );
}
