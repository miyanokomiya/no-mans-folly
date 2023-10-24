import { AffineMatrix, IRectangle, IVec2, applyAffine, getRectCenter, isSame, multiAffines, rotate, sub } from "okageo";
import { Direction2, EntityPatchInfo, Shape, StyleScheme } from "../models";
import { AlignBoxShape, isAlignBoxShape } from "../shapes/align/alignBox";
import { AlignLayoutNode, alignLayout } from "../utils/layouts/align";
import { flatTree, getBranchPath } from "../utils/tree";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { DocOutput } from "../models/document";
import { createShape, resizeShape } from "../shapes";
import { generateKeyBetween } from "fractional-indexing";
import { RectangleShape } from "../shapes/rectangle";
import {
  ISegment,
  TAU,
  getD2,
  getDistanceBetweenPointAndRect,
  getRotateFn,
  getRotationAffines,
  isPointOnRectangle,
} from "../utils/geometry";
import { applyDefaultStrokeStyle, applyStrokeStyle } from "../utils/strokeStyle";
import { applyFillStyle } from "../utils/fillStyle";
import { renderArrowUnit } from "../utils/renderer";
import { COLORS } from "../utils/color";

export type AlignHitResult = {
  seg: ISegment;
  findexBetween: [string | null, string | null];
};

interface AlignHandlerOption {
  getShapeComposite: () => ShapeComposite;
  alignBoxId: string;
}

export function newAlignHandler(option: AlignHandlerOption) {
  const shapeComposite = option.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const alignBox = shapeMap[option.alignBoxId] as AlignBoxShape;

  const alignBoxRect = {
    x: alignBox.p.x,
    y: alignBox.p.y,
    width: alignBox.width,
    height: alignBox.height,
  };
  const { rotateAffine, derotateAffine } = getRotationAffines(alignBox.rotation, getRectCenter(alignBoxRect));

  const siblingIds = shapeComposite.mergedShapeTreeMap[alignBox.id].children.map((c) => c.id);

  const siblingRects = siblingIds.map<[string, IRectangle]>((id) => {
    const shape = shapeMap[id];
    const derotatedShape = { ...shape, ...resizeShape(shapeComposite.getShapeStruct, shape, derotateAffine) };
    return [id, shapeComposite.getWrapperRect(derotatedShape)];
  });

  function hitTest(p: IVec2): AlignHitResult | undefined {
    let result: AlignHitResult | undefined;

    // When there's no sibling, test with align box itself.
    if (siblingRects.length === 0) {
      if (isPointOnRectangle(alignBoxRect, p)) {
        result = {
          seg: [
            { x: alignBoxRect.x, y: alignBoxRect.y },
            { x: alignBoxRect.x + alignBoxRect.width, y: alignBoxRect.y },
          ],
          findexBetween: [alignBox.findex, null],
        };
      }
    } else {
      const derotatedP = applyAffine(derotateAffine, p);
      const evaluated = siblingRects.map<[string, IRectangle, number]>(([id, rect]) => [
        id,
        rect,
        getDistanceBetweenPointAndRect(derotatedP, rect),
      ]);
      const [closestId, closestRect] = evaluated.sort((a, b) => a[2] - b[2])[0];
      const closestIndex = siblingIds.findIndex((id) => id === closestId);
      const closestShape = shapeMap[closestId];

      if (alignBox.direction === 0) {
        if (derotatedP.y < closestRect.y + closestRect.height / 2) {
          result = {
            seg: [
              { x: closestRect.x, y: closestRect.y },
              { x: closestRect.x + closestRect.width, y: closestRect.y },
            ],
            findexBetween: [
              closestIndex === 0 ? null : shapeMap[siblingIds[closestIndex - 1]].findex,
              closestShape.findex,
            ],
          };
        } else {
          result = {
            seg: [
              { x: closestRect.x, y: closestRect.y + closestRect.height },
              { x: closestRect.x + closestRect.width, y: closestRect.y + closestRect.height },
            ],
            findexBetween: [
              closestShape.findex,
              closestIndex === siblingIds.length - 1 ? null : shapeMap[siblingIds[closestIndex + 1]].findex,
            ],
          };
        }
      } else {
        if (derotatedP.x < closestRect.x + closestRect.width / 2) {
          result = {
            seg: [
              { x: closestRect.x, y: closestRect.y },
              { x: closestRect.x, y: closestRect.y + closestRect.height },
            ],
            findexBetween: [
              closestIndex === 0 ? null : shapeMap[siblingIds[closestIndex - 1]].findex,
              closestShape.findex,
            ],
          };
        } else {
          result = {
            seg: [
              { x: closestRect.x + closestRect.width, y: closestRect.y },
              { x: closestRect.x + closestRect.width, y: closestRect.y + closestRect.height },
            ],
            findexBetween: [
              closestShape.findex,
              closestIndex === siblingIds.length - 1 ? null : shapeMap[siblingIds[closestIndex + 1]].findex,
            ],
          };
        }
      }
    }

    if (result) {
      return {
        findexBetween: result.findexBetween,
        seg: [applyAffine(rotateAffine, result.seg[0]), applyAffine(rotateAffine, result.seg[1])],
      };
    }

    return;
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: AlignHitResult) {
    if (hitResult) {
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: style.selectionLineWidth * 2 * scale });
      ctx.beginPath();
      ctx.moveTo(hitResult.seg[0].x, hitResult.seg[0].y);
      ctx.lineTo(hitResult.seg[1].x, hitResult.seg[1].y);
      ctx.stroke();
    }
  }

  function isAlignChanged(idSet: Set<string>): boolean {
    return idSet.has(alignBox.id) || siblingIds.some((id) => idSet.has(id));
  }

  return { hitTest, render, isAlignChanged };
}
export type AlignHandler = ReturnType<typeof newAlignHandler>;

const DIRECTION_ANCHOR_SIZE = 10;

export type AlignBoxHitResult = AlignBoxDirectionHitResult | AlignBoxBaseSizeHitResult;

type AlignBoxDirectionHitResult = {
  type: "direction";
  direction: Direction2;
  p: IVec2;
};

type AlignBoxBaseSizeHitResult = {
  type: "optimize-width" | "optimize-height";
  p: IVec2;
};

export function newAlignBoxHandler(option: AlignHandlerOption) {
  const shapeComposite = option.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const alignBox = shapeMap[option.alignBoxId] as AlignBoxShape;
  const alignBoxRect = {
    x: alignBox.p.x,
    y: alignBox.p.y,
    width: alignBox.width,
    height: alignBox.height,
  };
  const { rotateAffine, derotateAffine } = getRotationAffines(alignBox.rotation, getRectCenter(alignBoxRect));

  const directionAnchor: AlignBoxDirectionHitResult =
    alignBox.direction === 0
      ? {
          type: "direction",
          direction: 1,
          p: { x: alignBoxRect.x + DIRECTION_ANCHOR_SIZE * 2, y: alignBoxRect.y - DIRECTION_ANCHOR_SIZE * 2 },
        }
      : {
          type: "direction",
          direction: 0,
          p: { x: alignBoxRect.x - DIRECTION_ANCHOR_SIZE * 2, y: alignBoxRect.y + DIRECTION_ANCHOR_SIZE * 2 },
        };

  const baseWidthOptimizeAnchor: AlignBoxBaseSizeHitResult | undefined =
    alignBox.baseWidth === undefined
      ? undefined
      : {
          type: "optimize-width",
          p: {
            x: alignBoxRect.x + alignBoxRect.width + DIRECTION_ANCHOR_SIZE * 2,
            y: alignBoxRect.y + alignBoxRect.height / 2,
          },
        };

  const baseHeightOptimizeAnchor: AlignBoxBaseSizeHitResult | undefined =
    alignBox.baseHeight === undefined
      ? undefined
      : {
          type: "optimize-height",
          p: {
            x: alignBoxRect.x + alignBoxRect.width / 2,
            y: alignBoxRect.y + alignBoxRect.height + DIRECTION_ANCHOR_SIZE * 2,
          },
        };

  function hitTest(p: IVec2, scale: number): AlignBoxHitResult | undefined {
    const derotatedP = applyAffine(derotateAffine, p);
    const threshold = DIRECTION_ANCHOR_SIZE * scale;
    const thresholdD2 = threshold * threshold;

    if (getD2(sub(directionAnchor.p, derotatedP)) <= thresholdD2) {
      return directionAnchor;
    }

    if (baseWidthOptimizeAnchor && getD2(sub(baseWidthOptimizeAnchor.p, derotatedP)) <= thresholdD2) {
      return baseWidthOptimizeAnchor;
    }

    if (baseHeightOptimizeAnchor && getD2(sub(baseHeightOptimizeAnchor.p, derotatedP)) <= thresholdD2) {
      return baseHeightOptimizeAnchor;
    }

    return;
  }

  function render(ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: AlignBoxHitResult) {
    const threshold = DIRECTION_ANCHOR_SIZE * scale;

    ctx.save();
    ctx.transform(...rotateAffine);

    applyDefaultStrokeStyle(ctx);
    applyFillStyle(ctx, { color: style.selectionPrimary });

    ctx.beginPath();
    ctx.arc(directionAnchor.p.x, directionAnchor.p.y, threshold, 0, TAU);
    ctx.fill();

    if (baseWidthOptimizeAnchor) {
      ctx.beginPath();
      ctx.arc(baseWidthOptimizeAnchor.p.x, baseWidthOptimizeAnchor.p.y, threshold, 0, TAU);
      ctx.fill();
    }

    if (baseHeightOptimizeAnchor) {
      ctx.beginPath();
      ctx.arc(baseHeightOptimizeAnchor.p.x, baseHeightOptimizeAnchor.p.y, threshold, 0, TAU);
      ctx.fill();
    }

    if (hitResult) {
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      ctx.beginPath();
      ctx.arc(hitResult.p.x, hitResult.p.y, threshold, 0, TAU);
      ctx.fill();
    }

    applyFillStyle(ctx, { color: COLORS.WHITE });
    renderArrowUnit(ctx, directionAnchor.p, directionAnchor.direction === 0 ? Math.PI / 2 : 0, threshold * 0.7);
    if (baseWidthOptimizeAnchor) {
      renderArrowUnit(ctx, baseWidthOptimizeAnchor.p, alignBox.baseWidth === undefined ? 0 : Math.PI, threshold * 0.7);
    }
    if (baseHeightOptimizeAnchor) {
      renderArrowUnit(ctx, baseHeightOptimizeAnchor.p, -Math.PI / 2, threshold * 0.7);
    }

    ctx.restore();
  }

  return { hitTest, render };
}
export type AlignBoxHandler = ReturnType<typeof newAlignBoxHandler>;

function toLayoutNode(shapeComposite: ShapeComposite, shape: Shape): AlignLayoutNode | undefined {
  const parent = shape.parentId ? shapeComposite.mergedShapeMap[shape.parentId] : undefined;
  const parentId = parent && isAlignBoxShape(parent) ? parent.id : "";

  if (isAlignBoxShape(shape)) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    return {
      id: shape.id,
      findex: shape.findex,
      parentId,
      type: "box",
      rect,
      direction: shape.direction,
      gap: shape.gap,
      baseWidth: shape.baseWidth,
      baseHeight: shape.baseHeight,
    };
  } else {
    const rect = shapeComposite.getWrapperRect(shape);
    return parentId ? { id: shape.id, findex: shape.findex, type: "entity", rect, parentId } : undefined;
  }
}

function toLayoutNodes(
  shapeComposite: ShapeComposite,
  rootId: string,
): { layoutNodes: AlignLayoutNode[]; rootShape: AlignBoxShape } {
  const root = shapeComposite.mergedShapeTreeMap[rootId];
  const rootShape = shapeComposite.mergedShapeMap[root.id] as AlignBoxShape;

  const c = getRectCenter({ x: rootShape.p.x, y: rootShape.p.y, width: rootShape.width, height: rootShape.height });
  const rotateFn = getRotateFn(rootShape.rotation, c);

  const layoutNodes: AlignLayoutNode[] = [];
  flatTree([root]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    const node = toLayoutNode(shapeComposite, {
      ...s,
      rotation: 0,
    });
    if (node) {
      if (rootShape.id !== t.id) {
        const sc = getRectCenter(node.rect);
        layoutNodes.push({
          ...node,
          rect: { ...node.rect, ...rotateFn(rotate(node.rect, s.rotation, sc), true) },
        });
      } else {
        layoutNodes.push(node);
      }
    }
  });
  return { layoutNodes, rootShape };
}

export function getNextAlignLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const { layoutNodes, rootShape } = toLayoutNodes(shapeComposite, rootId);
  const result = alignLayout(layoutNodes);

  // Apply root rotation to layout result if the root has rotation
  const rotatedPatchMap: { [id: string]: Partial<Shape> & Partial<AlignBoxShape> } = {};
  if (rootShape.rotation !== 0) {
    const layoutRootNode = layoutNodes.find((n) => n.id === rootId)!;
    const layoutRootCenter = getRectCenter(layoutRootNode.rect);
    const cos = Math.cos(rootShape.rotation);
    const sin = Math.sin(rootShape.rotation);
    const affine: AffineMatrix = multiAffines([
      [1, 0, 0, 1, layoutRootCenter.x, layoutRootCenter.y],
      [cos, sin, -sin, cos, 0, 0],
      [1, 0, 0, 1, -layoutRootCenter.x, -layoutRootCenter.y],
    ]);

    // Get updated shapes without rotation
    const updated = result.map<Shape>((r) => {
      const s = shapeComposite.shapeMap[r.id];
      if (isAlignBoxShape(s)) {
        return { ...s, rotation: 0, p: { x: r.rect.x, y: r.rect.y }, width: r.rect.width, height: r.rect.height };
      } else {
        return { ...s, rotation: 0, p: { x: r.rect.x, y: r.rect.y } };
      }
    });

    // Get rotated patch info
    updated.forEach((s) => {
      rotatedPatchMap[s.id] = resizeShape(shapeComposite.getShapeStruct, s, affine);
    });
  }

  const ret: { [id: string]: Partial<Shape> & Partial<AlignBoxShape> } = {};
  result.forEach((r) => {
    const s = shapeComposite.shapeMap[r.id];
    const rotatedPatch = rotatedPatchMap[r.id] ?? {};

    const patch: Partial<Shape> & Partial<AlignBoxShape> = {};
    let updated = false;

    const p = rotatedPatch.p ?? { x: r.rect.x, y: r.rect.y };
    if (!isSame(s.p, p)) {
      patch.p = p;
      updated = true;
    }

    if (rootShape.rotation !== s.rotation) {
      patch.rotation = rootShape.rotation;
      updated = true;
    }

    if (isAlignBoxShape(s)) {
      const width = rotatedPatch.width ?? r.rect.width;
      if (width !== s.width) {
        patch.width = width;
        updated = true;
      }

      const height = rotatedPatch.height ?? r.rect.height;
      if (height !== s.height) {
        patch.height = height;
        updated = true;
      }
    }

    if (updated) ret[r.id] = patch;
  });

  return ret;
}

export function getAlignLayoutPatchFunctions(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  return getModifiedAlignRootIds(srcComposite, updatedComposite, patchInfo).map((id) => {
    return () => getNextAlignLayout(updatedComposite, id);
  });
}

export function getModifiedAlignRootIds(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  const targetRootIdSet = new Set<string>();
  const deletedRootIdSet = new Set<string>();

  const shapeMap = srcComposite.shapeMap;
  const updatedShapeMap = updatedComposite.shapeMap;

  srcComposite.mergedShapeTreeMap;

  const saveParentBoxes = (s: Shape) => {
    // Seek the shallowest align box shape.
    getBranchPath(srcComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isAlignBoxShape(shapeMap[id])) {
        targetRootIdSet.add(id);
        return true;
      }
    });
  };

  const saveUpdatedParentBoxes = (s: Shape) => {
    // Seek the shallowest align box shape.
    getBranchPath(updatedComposite.mergedShapeTreeMap, s.id).some((id) => {
      if (isAlignBoxShape(updatedShapeMap[id])) {
        targetRootIdSet.add(id);
        return true;
      }
    });
  };

  if (patchInfo.add) {
    patchInfo.add.forEach((shape) => {
      saveUpdatedParentBoxes(shape);
    });
  }

  if (patchInfo.update) {
    Object.keys(patchInfo.update).forEach((id) => {
      const currentAlignId = getBranchPath(srcComposite.mergedShapeTreeMap, id).find((id) => {
        if (isAlignBoxShape(shapeMap[id])) {
          return true;
        }
      });

      const nextAlignId = getBranchPath(updatedComposite.mergedShapeTreeMap, id).find((id) => {
        if (isAlignBoxShape(updatedShapeMap[id])) {
          return true;
        }
      });

      if (currentAlignId && nextAlignId && id === currentAlignId && currentAlignId !== nextAlignId) {
        // Root board becomes a child of other board.
        // => Should pick eventual root board only.
        targetRootIdSet.add(nextAlignId);
      } else {
        if (currentAlignId) targetRootIdSet.add(currentAlignId);
        if (nextAlignId) targetRootIdSet.add(nextAlignId);
      }
    });
  }

  if (patchInfo.delete) {
    patchInfo.delete.forEach((id) => {
      const shape = shapeMap[id];
      if (isAlignBoxShape(shape)) {
        deletedRootIdSet.add(id);
      }
      saveParentBoxes(shape);
    });
  }

  return Array.from(targetRootIdSet).filter((id) => !deletedRootIdSet.has(id));
}

export function generateAlignTemplate(
  ctx: Pick<AppCanvasStateContext, "getShapeStruct" | "generateUuid" | "createLastIndex">,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const root = createShape<AlignBoxShape>(ctx.getShapeStruct, "align_box", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(ctx.createLastIndex(), null),
    height: 300,
    direction: 0,
    gap: 10,
  });
  const column0 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(root.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const column1 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column0.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const composite = newShapeComposite({
    shapes: [root, column0, column1],
    getStruct: ctx.getShapeStruct,
  });
  const patch = getNextAlignLayout(composite, root.id);
  const shapes = composite.shapes.map((s) => ({ ...s, ...patch[s.id] }));

  return { shapes, docMap: {} };
}
