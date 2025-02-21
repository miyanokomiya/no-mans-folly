import { AffineMatrix, IRectangle, IVec2, getDistance, getOuterRectangle, getRectCenter, moveRect } from "okageo";
import { Direction4, Shape, StyleScheme, UserSetting } from "../models";
import { cloneShapes, createShape, getIntersectedOutlines, hasSpecialOrderPriority } from "../shapes";
import { applyFillStyle } from "../utils/fillStyle";
import { LineShape, isLineShape } from "../shapes/line";
import { getOptimalElbowBody } from "../utils/elbowLine";
import { newRectHitRectHitTest } from "./shapeHitTest";
import { TAU, isRectOverlappedH, isRectOverlappedV } from "../utils/geometry";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { defineShapeHandler, ShapeHandler } from "./shapeHandlers/core";
import { generateKeyBetween } from "../utils/findex";
import { CanvasCTX } from "../utils/types";

const CHILD_MARGIN = 100;
const SIBLING_MARGIN = 25;
const ANCHOR_SIZE = 7;
const ANCHOR_MARGIN = 34;

export interface SmartBranchHitResult {
  index: Direction4;
  previewShapes: [Shape, LineShape]; // Their IDs are mocked.
}

export type SmartBranchHandler = ShapeHandler<SmartBranchHitResult> & {
  createBranch(
    branchIndex: SmartBranchHitResult["index"],
    generateId: () => string,
    lastFindex: string,
    branchTemplate?: BranchTemplate,
  ): [Shape, LineShape];
};

type BranchTemplate = Pick<UserSetting, "smartBranchLine">;

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
  branchTemplate?: BranchTemplate;
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
    const previewShapes = createBranch(
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
      const shapeComposite = newShapeComposite({
        shapes: hitResult.previewShapes,
        getStruct: option.getShapeComposite().getShapeStruct,
      });
      hitResult.previewShapes.forEach((s) => {
        ctx.globalAlpha = 0.5;
        shapeComposite.render(ctx, s);
        ctx.globalAlpha = 1;
      });

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
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId];
  const bounds = getOuterRectangle([shapeComposite.getLocalRectPolygon(shape)]);

  return {
    ...getBaseHandler(option),
    createBranch: (
      branchIndex: SmartBranchHitResult["index"],
      generateId: () => string,
      lastFindex: string,
      branchTemplate: BranchTemplate = {},
    ) =>
      createBranch(
        shapeComposite,
        shape,
        bounds,
        branchIndex,
        generateId,
        lastFindex,
        branchTemplate ?? option.branchTemplate,
      ),
  };
}

function isSameHitResult(a?: SmartBranchHitResult, b?: SmartBranchHitResult): boolean {
  if (a && b) {
    return a.index === b.index;
  } else {
    return a === b;
  }
}

function createBranch(
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

  const obstacles = getBranchObstacles(shapeComposite);
  const baseQ = getTargetPosition(branchIndex, bounds, obstacles);
  const affine: AffineMatrix = [1, 0, 0, 1, baseQ.x - bounds.x, baseQ.y - bounds.y];
  const moved: Shape = { ...shape, findex: findexForShape, ...shapeComposite.transformShape(shape, affine) };

  const pRect = shapeComposite.getWrapperRect(src);
  const qRect = moveRect(pRect, { x: baseQ.x - bounds.x, y: baseQ.y - bounds.y });
  const pCenter = getRectCenter(pRect);
  const qCenter = getRectCenter(qRect);
  const p =
    getIntersectedOutlines(getShapeStruct, src, getPBasePoint(branchIndex, pCenter, qCenter), pCenter)?.[0] ?? pCenter;
  const q =
    getIntersectedOutlines(getShapeStruct, moved, getQBasePoint(branchIndex, pCenter, qCenter), qCenter)?.[0] ??
    qCenter;

  const elbow = createShape<LineShape>(getShapeStruct, "line", {
    lineType: "elbow",
    ...branchTemplate.smartBranchLine,
    id: generateId(),
    findex: findexForElbow,
    p,
    q,
    pConnection: { id: src.id, rate: shapeComposite.getLocationRateOnShape(src, p) },
    qConnection: { id: moved.id, rate: shapeComposite.getLocationRateOnShape(moved, q) },
    body: getOptimalElbowBody(p, q, pRect, qRect, 30).map((a) => ({ p: a })),
  });

  return [moved, elbow];
}

export function getBranchObstacles(shapeComposite: ShapeComposite): IRectangle[] {
  const getShapeStruct = shapeComposite.getShapeStruct;
  return shapeComposite.shapes
    .filter((s) => !isLineShape(s) && !hasSpecialOrderPriority(getShapeStruct, s))
    .map((s) => shapeComposite.getWrapperRect(s));
}

function getTargetPosition(index: number, src: IRectangle, obstacles: IRectangle[]): IVec2 {
  switch (index) {
    case 0:
      return getAbovePosition(src, obstacles);
    case 1:
      return getRightPosition(src, obstacles);
    case 2:
      return getBelowPosition(src, obstacles);
    case 3:
      return getLeftPosition(src, obstacles);
    default:
      return getBelowPosition(src, obstacles);
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
  childMargin = CHILD_MARGIN,
  siblingMargin = SIBLING_MARGIN,
): IVec2 {
  return seekH({ ...src, y: src.y + src.height + childMargin }, obstacles, src.width + siblingMargin);
}

export function getAbovePosition(
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = CHILD_MARGIN,
  siblingMargin = SIBLING_MARGIN,
): IVec2 {
  return seekH({ ...src, y: src.y - (src.height + childMargin) }, obstacles, src.width + siblingMargin);
}

export function getRightPosition(
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = CHILD_MARGIN,
  siblingMargin = SIBLING_MARGIN,
): IVec2 {
  return seekV({ ...src, x: src.x + src.width + childMargin }, obstacles, src.height + siblingMargin);
}

export function getLeftPosition(
  src: IRectangle,
  obstacles: IRectangle[],
  childMargin = CHILD_MARGIN,
  siblingMargin = SIBLING_MARGIN,
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
