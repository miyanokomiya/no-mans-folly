import { add, sub } from "okageo";
import { isLineShape } from "../../../shapes/line";
import { getAttachmentAnchorPoint } from "../../lineAttachmentHandler";
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

  const movingShape = shapeComposite.findShapeAt(event.data.current, scope, [], false, ctx.getScale());
  if (!movingShape) return;

  const anchorP = getAttachmentAnchorPoint(shapeComposite, movingShape);
  const diff = sub(event.data.current, event.data.start);
  const movedAnchorP = add(anchorP, diff);

  const targetLine = shapeComposite.findShapeAt(movedAnchorP, scope, movingIds, false, ctx.getScale());
  if (!targetLine || !isLineShape(targetLine)) return;

  return {
    type: "stack-resume",
    getState: () => newMovingOnLineState({ lineId: targetLine.id, shapeId: movingShape.id }),
  };
}
