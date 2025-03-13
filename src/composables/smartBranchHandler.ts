import { AffineMatrix, IRectangle, IVec2, getDistance, getOuterRectangle, getRectCenter, moveRect } from "okageo";
import { Direction4, Shape, StyleScheme, UserSetting } from "../models";
import { cloneShapes, createShape, getIntersectedOutlines, hasSpecialOrderPriority } from "../shapes";
import { applyFillStyle } from "../utils/fillStyle";
import { LineShape, isLineShape } from "../shapes/line";
import { newRectHitRectHitTest } from "./shapeHitTest";
import { TAU, isRectOverlapped, isRectOverlappedH, isRectOverlappedV } from "../utils/geometry";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { defineShapeHandler, ShapeHandler } from "./shapeHandlers/core";
import { generateKeyBetween } from "../utils/findex";
import { CanvasCTX } from "../utils/types";
import { getPatchAfterLayouts } from "./shapeLayoutHandler";
import { newShapeRenderer } from "./shapeRenderer";

export const SMART_BRANCH_CHILD_MARGIN = 100;
export const SMART_BRANCH_SIBLING_MARGIN = 25;
const ANCHOR_SIZE = 7;
const ANCHOR_MARGIN = 34;

export interface SmartBranchHitResult {
  index: Direction4;
  previewShapes: [Shape, LineShape]; // Their IDs are mocked.
}

export type SmartBranchHandler = ShapeHandler<SmartBranchHitResult> & {
  // Should use this method to create proper shapes.
  createBranch(
    branchIndex: SmartBranchHitResult["index"],
    generateId: () => string,
    lastFindex: string,
  ): [Shape, LineShape];
  // Stored hit result is migrated as well when it exists.
  changeBranchTemplate(branchTemplate: BranchTemplate): SmartBranchHandler;
  clone(optionPatch?: Partial<Option>): SmartBranchHandler;
};

export type BranchTemplate = Pick<
  UserSetting,
  "smartBranchLine" | "smartBranchChildMargin" | "smartBranchSiblingMargin"
>;

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
  branchTemplate?: BranchTemplate;
  ignoreObstacles?: boolean;
}

const getBaseHandler = defineShapeHandler<SmartBranchHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId];
  const bounds = getOuterRectangle([shapeComposite.getLocalRectPolygon(shape)]);

  function getAnchors(scale: number) {
    const margin = ANCHOR_MARGIN * scale;
    return [
      { x: bounds.x + bounds.width / 2, y: bounds.y - margin },
      { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height / 2 },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + margin },
      { x: bounds.x - margin, y: bounds.y + bounds.height / 2 },
    ];
  }

  function hitTest(p: IVec2, scale = 1): SmartBranchHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;

    const index = getAnchors(scale).findIndex((a) => getDistance(a, p) <= threshold) as Direction4 | -1;
    if (index === -1) return;

    let count = 0;
    const previewShapes = createSmartBranch(
      shapeComposite,
      shape,
      bounds,
      index,
      () => `mock_${count++}`,
      shape.findex,
      option.branchTemplate,
    );
    return { index, previewShapes };
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: SmartBranchHitResult) {
    const threshold = ANCHOR_SIZE * scale;
    applyFillStyle(ctx, { color: style.selectionPrimary });

    const anchors = getAnchors(scale);
    anchors.forEach((a) => {
      ctx.beginPath();
      ctx.arc(a.x, a.y, threshold, 0, TAU);
      ctx.fill();
    });

    if (hitResult) {
      const previewShapeComposite = newShapeComposite({
        shapes: hitResult.previewShapes.map((s) => ({ ...s, alpha: (s.alpha ?? 1) * 0.3 })),
        getStruct: option.getShapeComposite().getShapeStruct,
      });
      const renderer = newShapeRenderer({
        shapeComposite: previewShapeComposite,
        scale,
      });
      renderer.render(ctx);

      applyFillStyle(ctx, { color: style.selectionSecondaly });
      const target = anchors[hitResult.index];
      ctx.beginPath();
      ctx.arc(target.x, target.y, threshold, 0, TAU);
      ctx.fill();
    }
  }

  return {
    render,
    hitTest,
    isSameHitResult,
  };
});

export function newSmartBranchHandler(option: Option): SmartBranchHandler {
  const srcShapeComposite = option.getShapeComposite();
  const shape = srcShapeComposite.shapeMap[option.targetId];
  const bounds = getOuterRectangle([srcShapeComposite.getLocalRectPolygon(shape)]);
  const shapeComposite = option.ignoreObstacles
    ? newShapeComposite({
        getStruct: srcShapeComposite.getShapeStruct,
        shapes: srcShapeComposite.getAllBranchMergedShapes([option.targetId]),
      })
    : srcShapeComposite;

  const base = getBaseHandler(option);
  return {
    ...base,
    createBranch: (branchIndex: SmartBranchHitResult["index"], generateId: () => string, lastFindex: string) => {
      return createSmartBranch(
        shapeComposite,
        shape,
        bounds,
        branchIndex,
        generateId,
        lastFindex,
        option.branchTemplate,
      );
    },
    changeBranchTemplate: (branchTemplate: BranchTemplate) => {
      const ret = newSmartBranchHandler({
        ...option,
        branchTemplate,
      });
      const hitResult = base.retrieveHitResult();
      if (hitResult) {
        let count = 0;
        ret.saveHitResult({
          index: hitResult.index,
          previewShapes: ret.createBranch(hitResult.index, () => `mock_${count++}`, shape.findex),
        });
      }
      return ret;
    },
    clone: (optionPatch) => {
      const ret = newSmartBranchHandler({ ...option, ...optionPatch });
      const hitResult = base.retrieveHitResult();
      if (hitResult) {
        let count = 0;
        ret.saveHitResult({
          index: hitResult.index,
          previewShapes: ret.createBranch(hitResult.index, () => `mock_${count++}`, shape.findex),
        });
      }
      return ret;
    },
  };
}

function isSameHitResult(a?: SmartBranchHitResult, b?: SmartBranchHitResult): boolean {
  if (a && b) {
    return a.index === b.index;
  } else {
    return a === b;
  }
}

function createSmartBranch(
  shapeComposite: ShapeComposite,
  src: Shape,
  bounds: IRectangle,
  branchIndex: SmartBranchHitResult["index"],
  generateId: () => string,
  lastFindex: string,
  branchTemplate: BranchTemplate = {},
): [Shape, LineShape] {
  const getShapeStruct = shapeComposite.getShapeStruct;
  const shape = cloneShapes(getShapeStruct, [src], generateId)[0];
  const findexForShape = generateKeyBetween(lastFindex, null);
  const findexForElbow = generateKeyBetween(findexForShape, null);

  const obstacles = getBranchObstacles(shapeComposite, src);
  const baseQ = getTargetPosition(
    branchIndex,
    bounds,
    obstacles,
    branchTemplate.smartBranchChildMargin,
    branchTemplate.smartBranchSiblingMargin,
  );
  const affine: AffineMatrix = [1, 0, 0, 1, baseQ.x - bounds.x, baseQ.y - bounds.y];
  const moved: Shape = {
    ...shape,
    id: generateId(),
    findex: findexForShape,
    ...shapeComposite.transformShape(shape, affine),
  };

  const pRect = shapeComposite.getWrapperRect(src);
  const qRect = moveRect(pRect, { x: baseQ.x - bounds.x, y: baseQ.y - bounds.y });
  const pCenter = getRectCenter(pRect);
  const qCenter = getRectCenter(qRect);
  const p =
    getIntersectedOutlines(getShapeStruct, src, getPBasePoint(branchIndex, pCenter, qCenter), pCenter)?.[0] ?? pCenter;
  const q =
    getIntersectedOutlines(getShapeStruct, moved, getQBasePoint(branchIndex, pCenter, qCenter), qCenter)?.[0] ??
    qCenter;

  const line = createShape<LineShape>(getShapeStruct, "line", {
    id: generateId(),
    findex: findexForElbow,
    lineType: "elbow",
    p,
    q,
    pConnection: { id: src.id, rate: shapeComposite.getLocationRateOnShape(src, p) },
    qConnection: { id: moved.id, rate: shapeComposite.getLocationRateOnShape(moved, q) },
  });

  const sm = newShapeComposite({
    getStruct: shapeComposite.getShapeStruct,
    shapes: [src, moved, line],
  });
  const patch = getPatchAfterLayouts(sm, {
    update: {
      [line.id]: branchTemplate.smartBranchLine ?? {},
    },
  });

  return [moved, line].map((s) => (patch[s.id] ? { ...s, ...patch[s.id] } : s)) as [Shape, LineShape];
}

export function getBranchObstacles(shapeComposite: ShapeComposite, src: Shape): IRectangle[] {
  const getShapeStruct = shapeComposite.getShapeStruct;
  const srcBounds = shapeComposite.getWrapperRect(src);
  return (
    shapeComposite.shapes
      .filter((s) => s.id !== src.id && !isLineShape(s) && !hasSpecialOrderPriority(getShapeStruct, s))
      .map((s) => shapeComposite.getWrapperRect(s))
      // Ignore shapes accommodating the source shape.
      .filter((rect) => !isRectOverlapped(rect, srcBounds))
  );
}

function getTargetPosition(
  index: number,
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = SMART_BRANCH_CHILD_MARGIN,
  siblingMargin = SMART_BRANCH_SIBLING_MARGIN,
): IVec2 {
  switch (index) {
    case 0:
      return getAbovePosition(src, obstacles, childMargin, siblingMargin);
    case 1:
      return getRightPosition(src, obstacles, childMargin, siblingMargin);
    case 2:
      return getBelowPosition(src, obstacles, childMargin, siblingMargin);
    case 3:
      return getLeftPosition(src, obstacles, childMargin, siblingMargin);
    default:
      return getBelowPosition(src, obstacles, childMargin, siblingMargin);
  }
}

function getPBasePoint(index: number, pCenter: IVec2, qCenter: IVec2): IVec2 {
  switch (index) {
    case 0:
    case 2:
      return { x: pCenter.x, y: qCenter.y };
    case 1:
    case 3:
      return { x: qCenter.x, y: pCenter.y };
    default:
      return { x: pCenter.x, y: qCenter.y };
  }
}

function getQBasePoint(index: number, pCenter: IVec2, qCenter: IVec2): IVec2 {
  switch (index) {
    case 0:
    case 2:
      return { x: qCenter.x, y: pCenter.y };
    case 1:
    case 3:
      return { x: pCenter.x, y: qCenter.y };
    default:
      return { x: qCenter.x, y: pCenter.y };
  }
}

export function getBelowPosition(
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = SMART_BRANCH_CHILD_MARGIN,
  siblingMargin = SMART_BRANCH_SIBLING_MARGIN,
): IVec2 {
  return seekH({ ...src, y: src.y + src.height + childMargin }, obstacles, src.width + siblingMargin);
}

export function getAbovePosition(
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = SMART_BRANCH_CHILD_MARGIN,
  siblingMargin = SMART_BRANCH_SIBLING_MARGIN,
): IVec2 {
  return seekH({ ...src, y: src.y - (src.height + childMargin) }, obstacles, src.width + siblingMargin);
}

export function getRightPosition(
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = SMART_BRANCH_CHILD_MARGIN,
  siblingMargin = SMART_BRANCH_SIBLING_MARGIN,
): IVec2 {
  return seekV({ ...src, x: src.x + src.width + childMargin }, obstacles, src.height + siblingMargin);
}

export function getLeftPosition(
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = SMART_BRANCH_CHILD_MARGIN,
  siblingMargin = SMART_BRANCH_SIBLING_MARGIN,
): IVec2 {
  return seekV({ ...src, x: src.x - (src.width + childMargin) }, obstacles, src.height + siblingMargin);
}

const MAX_LOOP = 10000;

function seekH(src: IRectangle, obstacles: IRectangle[], step: number): IVec2 {
  const range = { ...src };
  const filteredObstables = obstacles.filter((o) => isRectOverlappedH(range, o));
  let count = 0;

  while (count < MAX_LOOP) {
    const hitTest = newRectHitRectHitTest(range);
    if (filteredObstables.every((o) => !hitTest.test(o))) {
      break;
    }

    if (count % 2 === 1) {
      range.x += (src.x - range.x) * 2;
    } else {
      range.x += (src.x - range.x) * 2 + step;
    }

    count++;
  }

  return { x: range.x, y: range.y };
}

function seekV(src: IRectangle, obstacles: IRectangle[], step: number): IVec2 {
  const range = { ...src };
  const filteredObstables = obstacles.filter((o) => isRectOverlappedV(range, o));
  let count = 0;

  while (count < MAX_LOOP) {
    const hitTest = newRectHitRectHitTest(range);
    if (filteredObstables.every((o) => !hitTest.test(o))) {
      break;
    }

    if (count % 2 === 1) {
      range.y += (src.y - range.y) * 2;
    } else {
      range.y += (src.y - range.y) * 2 + step;
    }

    count++;
  }

  return { x: range.x, y: range.y };
}
