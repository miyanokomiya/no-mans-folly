import { add, getCenter, getRectCenter, IRectangle, rotate } from "okageo";
import { defineShapeHandler } from "./shapeHandlers/core";
import { SMART_BRANCH_SIBLING_MARGIN, SmartBranchHitResult } from "./smartBranchHandler";
import { renderRoundedSegment, renderValueLabel, scaleGlobalAlpha } from "../utils/renderer";
import { ISegment, isPointCloseToSegment } from "../utils/geometry";
import { COLORS } from "../utils/color";
import { Direction4, Shape, StyleScheme } from "../models";
import { CanvasCTX } from "../utils/types";
import { ShapeComposite } from "./shapeComposite";

const ANCHOR_SIZE = 4;
const ANCHOR_SEG_SIZE = 60;

export interface SmartBranchSettingHitResult {
  type: "child-margin" | "sibling-margin";
}

interface Option {
  smartBranchHitResult: SmartBranchHitResult;
  previewShapeComposite: ShapeComposite;
  smartBranchSiblingMargin?: number;
}

export const newSmartBranchSettingHandler = defineShapeHandler<SmartBranchSettingHitResult, Option>((option) => {
  const [previewShape] = option.smartBranchHitResult.previewShapes;
  const smartBranchSiblingMargin = option.smartBranchSiblingMargin ?? SMART_BRANCH_SIBLING_MARGIN;

  function getChildMarginAnchorLocal(scale: number): ISegment {
    const rect = option.previewShapeComposite.getWrapperRect(previewShape);
    return getChildMarginAnchor(rect, option.smartBranchHitResult.index, scale);
  }

  function getSiblingMarginAnchorLocal(scale: number): ISegment {
    const rect = option.previewShapeComposite.getWrapperRect(previewShape);
    return getSiblingMarginAnchor(rect, option.smartBranchHitResult.index, smartBranchSiblingMargin, scale);
  }

  return {
    hitTest(p, scale) {
      const threshold = ANCHOR_SIZE * scale;

      const childMarginAnchor = getChildMarginAnchorLocal(scale);
      if (isPointCloseToSegment(childMarginAnchor, p, threshold)) {
        return { type: "child-margin" };
      }

      const siblingMarginAnchor = getSiblingMarginAnchorLocal(scale);
      if (isPointCloseToSegment(siblingMarginAnchor, p, threshold)) {
        return { type: "sibling-margin" };
      }
    },
    render(ctx, style, scale, hitResult) {
      renderSiblingPreview(
        ctx,
        option.previewShapeComposite,
        previewShape,
        option.smartBranchHitResult.index,
        smartBranchSiblingMargin,
      );

      const threshold = 2 * ANCHOR_SIZE * scale;
      renderRoundedSegment(
        ctx,
        [getChildMarginAnchorLocal(scale)],
        threshold,
        hitResult?.type === "child-margin" ? style.selectionSecondaly : style.selectionPrimary,
        COLORS.WHITE,
      );
      renderRoundedSegment(
        ctx,
        [getSiblingMarginAnchorLocal(scale)],
        threshold,
        hitResult?.type === "sibling-margin" ? style.selectionSecondaly : style.selectionPrimary,
        COLORS.WHITE,
      );
    },
    isSameHitResult(a, b) {
      return a?.type === b?.type;
    },
  };
});
export type SmartBranchSettingHandler = ReturnType<typeof newSmartBranchSettingHandler>;

export function renderSmartBranchChildMarginAnchor(
  ctx: CanvasCTX,
  style: StyleScheme,
  scale: number,
  previewShapeComposite: ShapeComposite,
  previewShape: Shape,
  branchIndex: Direction4,
  margin: number,
  highlight = false,
  showLabel = false,
) {
  const threshold = 2 * ANCHOR_SIZE * scale;
  const seg = getChildMarginAnchor(previewShapeComposite.getWrapperRect(previewShape), branchIndex, scale);
  renderRoundedSegment(
    ctx,
    [seg],
    threshold,
    highlight ? style.selectionSecondaly : style.selectionPrimary,
    COLORS.WHITE,
  );
  if (showLabel) {
    const p = getCenter(seg[0], seg[1]);
    renderValueLabel(ctx, margin, p);
  }
}

export function renderSmartBranchSiblingMarginAnchor(
  ctx: CanvasCTX,
  style: StyleScheme,
  scale: number,
  previewShapeComposite: ShapeComposite,
  previewShape: Shape,
  branchIndex: Direction4,
  margin: number,
  highlight = false,
  showLabel = false,
) {
  const threshold = 2 * ANCHOR_SIZE * scale;
  renderSiblingPreview(ctx, previewShapeComposite, previewShape, branchIndex, margin);
  const seg = getSiblingMarginAnchor(previewShapeComposite.getWrapperRect(previewShape), branchIndex, margin, scale);
  renderRoundedSegment(
    ctx,
    [seg],
    threshold,
    highlight ? style.selectionSecondaly : style.selectionPrimary,
    COLORS.WHITE,
  );
  if (showLabel) {
    const p = getCenter(seg[0], seg[1]);
    renderValueLabel(ctx, margin, p);
  }
}

function getChildMarginAnchor(rect: IRectangle, branchIndex: Direction4, scale: number): ISegment {
  const segSize = ANCHOR_SEG_SIZE * scale;
  const c = getRectCenter(rect);
  const p = add(c, rotate({ x: 0, y: rect.height / 2 }, (Math.PI / 2) * branchIndex));
  return branchIndex % 2 === 0
    ? [add(p, { x: -segSize / 2, y: 0 }), add(p, { x: segSize / 2, y: 0 })]
    : [add(p, { x: 0, y: -segSize / 2 }), add(p, { x: 0, y: segSize / 2 })];
}

function getSiblingMarginAnchor(rect: IRectangle, branchIndex: Direction4, margin: number, scale: number): ISegment {
  const segSize = ANCHOR_SEG_SIZE * scale;
  const c = getRectCenter(rect);
  const p = add(c, rotate({ x: -rect.width / 2 - margin, y: 0 }, (Math.PI / 2) * branchIndex));
  return branchIndex % 2 === 0
    ? [add(p, { x: 0, y: -segSize / 2 }), add(p, { x: 0, y: segSize / 2 })]
    : [add(p, { x: -segSize / 2, y: 0 }), add(p, { x: segSize / 2, y: 0 })];
}

function renderSiblingPreview(
  ctx: CanvasCTX,
  previewShapeComposite: ShapeComposite,
  previewShape: Shape,
  branchIndex: Direction4,
  margin: number,
) {
  const rect = previewShapeComposite.getWrapperRect(previewShape);
  const v = rotate({ x: -rect.width - margin, y: 0 }, (Math.PI / 2) * branchIndex);
  const sibling = { ...previewShape, ...previewShapeComposite.transformShape(previewShape, [1, 0, 0, 1, v.x, v.y]) };
  const vSub = rotate({ x: rect.width + margin, y: 0 }, (Math.PI / 2) * branchIndex);
  const siblingSub = {
    ...previewShape,
    ...previewShapeComposite.transformShape(previewShape, [1, 0, 0, 1, vSub.x, vSub.y]),
  };
  scaleGlobalAlpha(ctx, 0.7, () => {
    previewShapeComposite.render(ctx, sibling);
    previewShapeComposite.render(ctx, siblingSub);
  });
}
