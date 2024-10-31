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
  const target = shapeComposite.findShapeAt(event.data.current, scope, movingIds, false, ctx.getScale());
  if (!target || !isLineShape(target)) return;

  return {
    type: "stack-resume",
    getState: () => newMovingOnLineState({ lineId: target.id }),
  };
}
