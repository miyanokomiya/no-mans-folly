import { Shape } from "../../../models";
import { isAlignBoxShape } from "../../../shapes/align/alignBox";
import { isBoardCardShape } from "../../../shapes/board/boardCard";
import { isBoardRootShape } from "../../../shapes/board/boardRoot";
import { isFrameShape } from "../../../shapes/frame";
import { FrameAlignGroupShape, isFrameAlignGroupShape } from "../../../shapes/frameGroups/frameAlignGroup";
import { isTableShape } from "../../../shapes/table/table";
import { findBackward, mergeMap } from "../../../utils/commons";
import { ModifierOptions } from "../../../utils/devices";
import { BoundingBox } from "../../boundingBox";
import { ShapeComposite, findBetterShapeAt, getClosestShapeByType } from "../../shapeComposite";
import { canJoinGeneralLayout, getClosestLayoutShapeAt } from "../../shapeHandlers/layoutHandler";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { PointerMoveEvent, TransitionValue } from "../core";
import { newMovingShapeInAlignState } from "./align/movingShapeInAlignState";
import { newBoardCardMovingState } from "./board/boardCardMovingState";
import { AppCanvasStateContext } from "./core";
import { newMovingFrameInAlignState } from "./frameAlign/movingFrameInAlignState";

/**
 * Returns layout dedicated moving state when target shapes are on a layout.
 */
export function handlePointerMoveOnLayout(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
  indexId: string,
  option?: { boundingBox?: BoundingBox },
): TransitionValue<AppCanvasStateContext> {
  if (event.data.ctrl) return;
  if (movingIds.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  const boardId = canAttendToBoard(ctx, event);
  if (boardId) {
    return {
      type: "stack-resume",
      getState: () => newBoardCardMovingState({ boardId }),
    };
  } else if (canSomeJoinGeneralLayout(ctx)) {
    const scope = shapeComposite.getSelectionScope(shapeComposite.shapeMap[indexId]);
    const shapeAtPoint = findBetterShapeAt(shapeComposite, event.data.current, scope, movingIds);
    if (!shapeAtPoint) return;

    const layoutShape = getClosestLayoutShapeAt(shapeComposite, shapeAtPoint.id);
    if (!layoutShape) return;

    if (isAlignBoxShape(layoutShape)) {
      return {
        type: "stack-resume",
        getState: () => newMovingShapeInAlignState({ boundingBox: option?.boundingBox, alignBoxId: layoutShape.id }),
      };
    } else if (isTableShape(layoutShape)) {
      return {
        type: "stack-resume",
        getState: () =>
          ctx.states.newMovingShapeInTableState({ boundingBox: option?.boundingBox, tableId: layoutShape.id }),
      };
    }
  }
}

function canAttendToBoard(ctx: AppCanvasStateContext, event: PointerMoveEvent): string | undefined {
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  const shapeComposite = ctx.getShapeComposite();
  const shapes = ids.map((id) => shapeComposite.shapeMap[id]);
  // Allow unalignable shapes to be mixed so that connected lines are dealt with well.
  if (!shapes.some((s) => isBoardCardShape(s))) return;

  const board = findBackward(shapeComposite.shapes.filter(isBoardRootShape), (s) =>
    shapeComposite.isPointOn(s, event.data.current),
  );
  return board?.id;
}

/**
 * Returned value contains src "shapePatch".
 * "targetIds" has be passed because "shapePatch" contains updated child shapes.
 */
export function getPatchByPointerUpOutsideLayout(
  shapeComposite: ShapeComposite,
  shapePatch: { [id: string]: Partial<Shape> },
  targetIds: string[],
): { [id: string]: Partial<Shape> } {
  const targetIdSet = new Set(targetIds);
  const detatched = targetIds.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
    if (shouldDetachParentWhenOutside(shapeComposite.shapeMap, id)) {
      // The parent layout may be a target as well.
      // => If so, this shape should stay in the layout.
      if (!targetIdSet.has(shapeComposite.shapeMap[id].parentId ?? "")) {
        p[id] = { parentId: undefined, parentMeta: undefined };
      }
    }
    return p;
  }, {});
  const adjusted = mergeMap(shapePatch, detatched);
  return getPatchByLayouts(shapeComposite, { update: adjusted });
}

function canSomeJoinGeneralLayout(ctx: AppCanvasStateContext) {
  const shapeComposite = ctx.getShapeComposite();
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  // Allow unalignable shapes to be mixed so that connected lines are dealt with well.
  return ids.some((id) => canJoinGeneralLayout(shapeComposite, shapeComposite.shapeMap[id]));
}

/**
 * Certain shape type can leave its layout parent, but other can't.
 * e.g. "board_card" can leave but "tree_node" can't.
 */
function shouldDetachParentWhenOutside(shapeMap: { [id: string]: Shape }, id: string): boolean {
  const shape = shapeMap[id];
  if (!shape.parentId) return false;

  const parent = shapeMap[shape.parentId];
  if (!parent) return false;

  return isFrameAlignGroupShape(parent) || isAlignBoxShape(parent) || isBoardRootShape(parent) || isTableShape(parent);
}

/**
 * Parallel to "handlePointerMoveOnLayout" but for frame layouts.
 */
export function handlePointerMoveOnFrameLayout(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
  indexId: string,
  option?: ModifierOptions & { boundingBox?: BoundingBox },
): TransitionValue<AppCanvasStateContext> {
  if (event.data.ctrl) return;
  if (movingIds.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();

  const frameIds = movingIds.filter((id) => {
    const s = shapeComposite.shapeMap[id];
    return isFrameShape(s);
  });
  if (frameIds.length === 0) return;

  const scope = shapeComposite.getSelectionScope(shapeComposite.shapeMap[indexId]);
  const shapeAtPoint = findBetterShapeAt(shapeComposite, event.data.current, scope, movingIds);
  if (shapeAtPoint) {
    const layoutShape = getClosestShapeByType<FrameAlignGroupShape>(
      shapeComposite,
      shapeAtPoint.id,
      "frame_align_group",
    );
    if (layoutShape) {
      return {
        type: "stack-resume",
        getState: () =>
          newMovingFrameInAlignState({
            boundingBox: option?.boundingBox,
            alignBoxId: layoutShape.id,
          }),
      };
    }
  }
}
