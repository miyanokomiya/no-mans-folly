import { IVec2, getDistance, getRectCenter } from "okageo";
import { ShapeComposite } from "../shapeComposite";
import { defineShapeHandler } from "./core";
import { applyFillStyle } from "../../utils/fillStyle";
import { isSameValue, TAU } from "../../utils/geometry";
import { Shape, StyleScheme } from "../../models";
import { isLineShape } from "../../shapes/line";
import { CanvasCTX } from "../../utils/types";

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

  const rotationAnchorInfoList: RotationAnchorInfo[] = getIncoordinateAngledShapes(
    option.targetIds.map((id) => shapeComposite.shapeMap[id]),
    option.rotation,
  ).map((s) => [s.id, s.rotation, getRectCenter(shapeComposite.getWrapperRect(s))]);

  function hitTest(p: IVec2, scale: number): HitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const info = rotationAnchorInfoList.find((info) => getDistance(info[2], p) <= threshold);
    if (info) return { type: "rotation", info };
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: HitResult) {
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

function getIncoordinateAngledShapes(shapes: Shape[], origin: number) {
  const checkFn = getIsCoordinateAngleFn(origin);
  return shapes.filter((s) => !isLineShape(s) && !checkFn(s.rotation));
}

export function getIsCoordinateAngleFn(origin: number): (r: number) => boolean {
  return (r) => {
    const cos = Math.cos(r - origin);
    const sin = Math.sin(r - origin);
    return isSameValue(Math.abs(cos * sin), 0);
  };
}
