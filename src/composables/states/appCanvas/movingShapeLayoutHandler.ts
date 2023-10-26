import { Shape } from "../../../models";
import { AlignBoxShape } from "../../../shapes/align/alignBox";
import { mapReduce } from "../../../utils/commons";
import { canAttendToAlignBox } from "../../alignHandler";
import { BoundingBox } from "../../boundingBox";
import { findBetterShapeAt, getClosestShapeByType } from "../../shapeComposite";
import { getPatchByLayouts } from "../../shapeLayoutHandler";
import { PointerMoveEvent, TransitionValue } from "../core";
import { newMovingShapeInAlignState } from "./align/movingShapeInAlignState";
import { AppCanvasStateContext } from "./core";

/**
 * Returns layout dedicated moving state when target shapes are on a layout.
 */
export function handlePointerMoveOnLayout(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
  option?: { boundingBox?: BoundingBox },
): TransitionValue<AppCanvasStateContext> {
  if (movingIds.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  if (canAlign(ctx)) {
    const scope = shapeComposite.getSelectionScope(shapeComposite.shapeMap[movingIds[0]]);
    const shapeAtPoint = findBetterShapeAt(shapeComposite, event.data.current, scope, movingIds);
    if (shapeAtPoint) {
      const alignBoxShape = getClosestShapeByType<AlignBoxShape>(shapeComposite, shapeAtPoint.id, "align_box");
      if (alignBoxShape) {
        return {
          type: "stack-resume",
          getState: () =>
            newMovingShapeInAlignState({ boundingBox: option?.boundingBox, alignBoxId: alignBoxShape.id }),
        };
      }
    }
  }
}

/**
 * Returned value contains src "shapePatch".
 */
export function getPatchByPointerUpOutsideLayout(
  ctx: AppCanvasStateContext,
  shapePatch: { [id: string]: Partial<Shape> },
): { [id: string]: Partial<Shape> } {
  const shapeComposite = ctx.getShapeComposite();
  const selectedIdMap = ctx.getSelectedShapeIdMap();
  const adjusted = canAlign(ctx)
    ? mapReduce(shapePatch, (v, id) => (selectedIdMap[id] ? { ...v, parentId: undefined } : v))
    : shapePatch;
  return getPatchByLayouts(shapeComposite, { update: adjusted });
}

function canAlign(ctx: AppCanvasStateContext) {
  const shapeComposite = ctx.getShapeComposite();
  const ids = Object.keys(ctx.getSelectedShapeIdMap());
  return ids.some((id) => canAttendToAlignBox(shapeComposite, shapeComposite.shapeMap[id]));
}
