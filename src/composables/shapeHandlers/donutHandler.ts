import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyLocalSpace, renderOutlinedCircle } from "../../utils/renderer";
import { DonutShape } from "../../shapes/donut";
import { CanvasCTX } from "../../utils/types";

export const ANCHOR_SIZE = 6;

type HitAnchor = [type: "holeRate", IVec2];

interface HitResult {
  type: HitAnchor[0];
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newDonutHandler = defineShapeHandler<HitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as DonutShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.rx * 2, height: shape.ry * 2 };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  function getAnchors(): HitAnchor[] {
    return [["holeRate", getDonutHoleRateLocalControl(shape)]];
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
export type DonutHandler = ReturnType<typeof newDonutHandler>;

export function getDonutHoleRateLocalControl(shape: DonutShape): IVec2 {
  return { x: shape.rx, y: shape.ry * (1 - shape.holeRate) };
}
