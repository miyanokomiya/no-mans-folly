import { AffineMatrix, IRectangle, IVec2, getDistance, getRectCenter, moveRect } from "okageo";
import { Shape, StyleScheme } from "../models";
import { cloneShapes, createShape, getIntersectedOutlines } from "../shapes";
import { applyFillStyle } from "../utils/fillStyle";
import { LineShape, isLineShape } from "../shapes/line";
import { getOptimalElbowBody } from "../utils/elbowLine";
import { newRectHitRectHitTest } from "./shapeHitTest";
import { TAU, isRectOverlappedH, isRectOverlappedV } from "../utils/geometry";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";

const CHILD_MARGIN = 100;
const SIBLING_MARGIN = 25;
const ANCHOR_SIZE = 7;
const ANCHOR_MARGIN = 24;

export interface SmartBranchHitResult {
  index: number; // index of anchor array: [top, right, bottom, left]
  previewShapes: [Shape, LineShape];
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  bounds: IRectangle;
}

export function newSmartBranchHandler(option: Option) {
  function getAnchors(scale: number) {
    const margin = ANCHOR_MARGIN * scale;
    return [
      { x: option.bounds.x + option.bounds.width / 2, y: option.bounds.y - margin },
      { x: option.bounds.x + option.bounds.width + margin, y: option.bounds.y + option.bounds.height / 2 },
      { x: option.bounds.x + option.bounds.width / 2, y: option.bounds.y + option.bounds.height + margin },
      { x: option.bounds.x - margin, y: option.bounds.y + option.bounds.height / 2 },
    ];
  }

  function hitTest(p: IVec2, src: Shape, scale = 1): SmartBranchHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;

    const index = getAnchors(scale).findIndex((a) => getDistance(a, p) <= threshold);
    if (index === -1) return;

    const previewShapes = createBranch({ index }, src, () => "mock");
    return { index, previewShapes };
  }

  function createBranch(
    hitResult: Pick<SmartBranchHitResult, "index">,
    src: Shape,
    generateId: () => string,
  ): [Shape, LineShape] {
    const shapeComposite = option.getShapeComposite();
    const getShapeStruct = shapeComposite.getShapeStruct;
    const shape = cloneShapes(getShapeStruct, [src], generateId)[0];

    const obstacles = Object.values(shapeComposite.shapeMap)
      .filter((s) => !isLineShape(s))
      .map((s) => {
        return shapeComposite.getWrapperRect(s);
      });
    const baseQ = getTargetPosition(hitResult.index, option.bounds, obstacles);
    const affine: AffineMatrix = [1, 0, 0, 1, baseQ.x - option.bounds.x, baseQ.y - option.bounds.y];
    const moved = { ...shape, ...shapeComposite.transformShape(shape, affine) };

    const pRect = shapeComposite.getWrapperRect(src);
    const qRect = moveRect(pRect, { x: baseQ.x - option.bounds.x, y: baseQ.y - option.bounds.y });
    const pCenter = getRectCenter(pRect);
    const qCenter = getRectCenter(qRect);
    const p =
      getIntersectedOutlines(getShapeStruct, src, getPBasePoint(hitResult.index, pCenter, qCenter), pCenter)?.[0] ??
      pCenter;
    const q =
      getIntersectedOutlines(getShapeStruct, moved, getQBasePoint(hitResult.index, pCenter, qCenter), qCenter)?.[0] ??
      qCenter;

    shapeComposite.getLocationRateOnShape(src, p);
    const elbow = createShape<LineShape>(getShapeStruct, "line", {
      id: generateId(),
      lineType: "elbow",
      p,
      q,
      pConnection: { id: src.id, rate: shapeComposite.getLocationRateOnShape(src, p) },
      qConnection: { id: moved.id, rate: shapeComposite.getLocationRateOnShape(moved, q) },
      body: getOptimalElbowBody(p, q, pRect, qRect, 30).map((a) => ({ p: a })),
    });

    return [moved, elbow];
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: SmartBranchHitResult) {
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
    createBranch,
  };
}
export type SmartBranchHandler = ReturnType<typeof newSmartBranchHandler>;

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
