import { isLineShape } from "../../../shapes/line";
import { PointerMoveEvent, TransitionValue } from "../core";
import { AppCanvasStateContext } from "./core";
import { newMovingOnLineState } from "./lines/movingOnLineState";

export function handlePointerMoveOnLine(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
): TransitionValue<AppCanvasStateContext> {
  if (event.data.ctrl) return;
  if (movingIds.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  const scope = shapeComposite.getSelectionScope(shapeComposite.shapeMap[movingIds[0]]);
  const targetLine = shapeComposite.findShapeAt(event.data.current, scope, movingIds, false, ctx.getScale());
  if (!targetLine || !isLineShape(targetLine)) return;

  const movingShape = shapeComposite.findShapeAt(event.data.current, scope, [targetLine.id], false, ctx.getScale());
  if (!movingShape) return;

  return {
    type: "stack-resume",
    getState: () => newMovingOnLineState({ lineId: targetLine.id, shapeId: movingShape.id }),
  };
}
