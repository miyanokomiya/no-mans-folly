import { add, getCenter, getRectCenter, IRectangle, rotate, sub } from "okageo";
import { defineShapeHandler } from "./shapeHandlers/core";
import { SMART_BRANCH_SIBLING_MARGIN, SmartBranchHitResult } from "./smartBranchHandler";
import { renderRoundedSegment, renderValueLabel, scaleGlobalAlpha } from "../utils/renderer";
import { getLocationFromRateOnRectPath, getRotateFn, ISegment, isPointCloseToSegment } from "../utils/geometry";
import { COLORS } from "../utils/color";
import { Direction4, Shape, StyleScheme } from "../models";
import { CanvasCTX } from "../utils/types";
import { newShapeComposite, ShapeComposite } from "./shapeComposite";
import { cloneShapes } from "../shapes";
import { getPatchAfterLayouts } from "./shapeLayoutHandler";

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
      renderSmartBranchPreview(
        ctx,
        option.previewShapeComposite,
        option.smartBranchHitResult,
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
  smartBranchHitResult: SmartBranchHitResult,
  margin: number,
  highlight = false,
  showLabel = false,
) {
  const threshold = 2 * ANCHOR_SIZE * scale;
  const seg = getSiblingMarginAnchor(
    previewShapeComposite.getWrapperRect(smartBranchHitResult.previewShapes[0]),
    smartBranchHitResult.index,
    margin,
    scale,
  );
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

export function renderSmartBranchPreview(
  ctx: CanvasCTX,
  previewShapeComposite: ShapeComposite,
  smartBranchHitResult: SmartBranchHitResult,
  smartBranchSiblingMargin: number,
) {
  const branchIndex = smartBranchHitResult.index;
  const [previewShape, previewLine] = smartBranchHitResult.previewShapes;
  if (!previewLine.pConnection) return;

  const rect = previewShapeComposite.getWrapperRect(previewShape);
  const rotateFn = getRotateFn((Math.PI / 2) * branchIndex);
  const v1 = rotateFn({ x: -rect.width - smartBranchSiblingMargin, y: 0 });
  const v2 = rotate(v1, Math.PI);

  const pOrigin = getLocationFromRateOnRectPath(
    previewShapeComposite.getLocalRectPolygon(previewShape),
    previewShape.rotation,
    previewLine.pConnection.rate,
  );
  const srcV = sub(previewLine.p, pOrigin);
  const mockSrc = {
    ...previewShape,
    id: previewLine.pConnection.id,
    ...previewShapeComposite.transformShape(previewShape, [1, 0, 0, 1, srcV.x, srcV.y]),
  };

  let count = 0;
  const fistShapes = cloneShapes(
    previewShapeComposite.getShapeStruct,
    [mockSrc, previewShape, previewLine],
    () => `${previewShape}_dummy_${count++}`,
  );
  const secondShapes = cloneShapes(
    previewShapeComposite.getShapeStruct,
    [mockSrc, previewShape, previewLine],
    () => `${previewShape}_dummy_${count++}`,
  );

  const sm = newShapeComposite({
    getStruct: previewShapeComposite.getShapeStruct,
    shapes: [previewShape, ...fistShapes, ...secondShapes],
  });
  const patch = getPatchAfterLayouts(sm, {
    update: {
      [fistShapes[1].id]: previewShapeComposite.transformShape(previewShape, [1, 0, 0, 1, v1.x, v1.y]),
      [secondShapes[1].id]: previewShapeComposite.transformShape(previewShape, [1, 0, 0, 1, v2.x, v2.y]),
    },
  });

  scaleGlobalAlpha(ctx, 0.7, () => {
    [fistShapes[1], fistShapes[2], secondShapes[1], secondShapes[2]].forEach((s) => {
      sm.render(ctx, { ...s, ...patch[s.id] });
    });
  });
  previewShapeComposite.shapes.forEach((s) => {
    sm.render(ctx, { ...s, ...patch[s.id] });
  });
}
