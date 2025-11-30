import { IVec2, getDistance, getRectCenter, sub } from "okageo";
import { Sheet, StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { getRotateFn } from "../../utils/geometry";
import { defineShapeHandler } from "./core";
import { applyDefaultTextStyle, applyLocalSpace, renderLoopeIcon, renderOutlinedCircle } from "../../utils/renderer";
import { SheetImageShape } from "../../shapes/sheetImage";
import { applyFillStyle } from "../../utils/fillStyle";
import { COLORS } from "../../utils/color";
import { CanvasCTX } from "../../utils/types";
import { getSheetIdFromThumbnailFileName } from "../../utils/fileAccess";
import { applyStrokeStyle } from "../../utils/strokeStyle";

const ANCHOR_SIZE_OPEN = 10;

type HitAnchor = [type: "open", IVec2];

export interface SheetImageHitResult {
  type: HitAnchor[0];
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
  sheets: Sheet[];
  selectedSheetId?: string;
}

export const newSheetImageHandler = defineShapeHandler<SheetImageHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as SheetImageShape;
  const shapeRect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
  const rotateFn = getRotateFn(shape.rotation, getRectCenter(shapeRect));

  const sheetId = shape.assetId ? getSheetIdFromThumbnailFileName(shape.assetId) : undefined;
  const sheetIndex = sheetId ? option.sheets.findIndex((s) => s.id === sheetId) : -1;
  const sheet = sheetIndex !== -1 ? option.sheets[sheetIndex] : undefined;
  const canOpenSheet = sheet && sheetId !== option.selectedSheetId;

  function getOpenAnchor(scale: number): HitAnchor {
    const y = shapeRect.height + ANCHOR_SIZE_OPEN * 1.3 * scale;
    return ["open", { x: 1.3 * ANCHOR_SIZE_OPEN * scale, y }];
  }

  function hitTest(p: IVec2, scale = 1): SheetImageHitResult | undefined {
    const adjustedP = sub(rotateFn(p, true), shape.p);

    const thresholdJump = ANCHOR_SIZE_OPEN * scale;
    const openAnchor = getOpenAnchor(scale);
    if (canOpenSheet && getDistance(openAnchor[1], adjustedP) <= thresholdJump) {
      return { type: openAnchor[0] };
    }
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: SheetImageHitResult) {
    applyLocalSpace(ctx, shapeRect, shape.rotation, () => {
      const thresholdJump = ANCHOR_SIZE_OPEN * scale;
      const openAnchor = getOpenAnchor(scale);
      renderOutlinedCircle(
        ctx,
        openAnchor[1],
        thresholdJump,
        !canOpenSheet
          ? COLORS.GRAY_1
          : hitResult?.type === openAnchor[0]
            ? style.selectionSecondaly
            : style.selectionPrimary,
      );
      applyFillStyle(ctx, { color: COLORS.WHITE });
      renderLoopeIcon(ctx, openAnchor[1], thresholdJump * 0.9);

      if (sheet) {
        applyDefaultTextStyle(ctx, 18 * scale, "left", true);
        applyStrokeStyle(ctx, { color: COLORS.WHITE, width: scale });
        const text = `${sheetIndex + 1}. ${sheet.name}`;
        const p = { x: openAnchor[1].x + ANCHOR_SIZE_OPEN * 1.5 * scale, y: openAnchor[1].y + 2 * scale };
        ctx.strokeText(text, p.x, p.y);
        applyFillStyle(ctx, { color: COLORS.BLACK });
        ctx.fillText(text, p.x, p.y);
      }
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
export type SheetImageHandler = ReturnType<typeof newSheetImageHandler>;
