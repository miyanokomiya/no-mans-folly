import { IVec2, MINVALUE, getDistance, getRectCenter } from "okageo";
import { ShapeComposite } from "../shapeComposite";
import { defineShapeHandler } from "./core";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU } from "../../utils/geometry";
import { StyleScheme } from "../../models";
import { isLineShape } from "../../shapes/line";

const ANCHOR_SIZE = 6;

type RotationAnchorInfo = [id: string, rotation: number, anchor: IVec2];

interface HitResult {
  type: "rotation";
  info: RotationAnchorInfo;
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetIds: string[];
  rotation: number;
}

export const newMultipleSelectedHandler = defineShapeHandler<HitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const rotationAnchorInfoList: RotationAnchorInfo[] = option.targetIds
    .map((id) => shapeComposite.shapeMap[id])
    .filter((s) => !isLineShape(s) && Math.abs(s.rotation - option.rotation) > MINVALUE)
    .map((s) => [s.id, s.rotation, getRectCenter(shapeComposite.getWrapperRect(s))]);

  function hitTest(p: IVec2, scale: number): HitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const info = rotationAnchorInfoList.find((info) => getDistance(info[2], p) <= threshold);
    if (info) return { type: "rotation", info };
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: HitResult) {
    const threshold = ANCHOR_SIZE * scale;

    applyFillStyle(ctx, { color: style.selectionPrimary });
    rotationAnchorInfoList.forEach((info) => {
      ctx.beginPath();
      ctx.arc(info[2].x, info[2].y, threshold, 0, TAU);
      ctx.fill();
    });

    if (hitResult?.type === "rotation") {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      ctx.beginPath();
      ctx.arc(hitResult.info[2].x, hitResult.info[2].y, threshold, 0, TAU);
      ctx.fill();
    }
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      return a?.type === b?.type && a?.info === b?.info;
    },
  };
});
export type MultipleSelectedHandler = ReturnType<typeof newMultipleSelectedHandler>;
