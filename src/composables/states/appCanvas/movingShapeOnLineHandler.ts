import { add, sub } from "okageo";
import { isLineShape } from "../../../shapes/line";
import { getAttachmentAnchorPoint } from "../../lineAttachmentHandler";
import { PointerMoveEvent, TransitionValue } from "../core";
import { AppCanvasStateContext } from "./core";
import { newShapeComposite } from "../../shapeComposite";

export function handlePointerMoveOnLine(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
): TransitionValue<AppCanvasStateContext> {
  if (event.data.ctrl) return;
  if (movingIds.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  const movingIdSet = new Set(movingIds);
  const subShapeComposite = newShapeComposite({
    shapes: shapeComposite.shapes.filter((s) => movingIdSet.has(s.id)),
    getStruct: shapeComposite.getShapeStruct,
  });

  const movingShape = subShapeComposite.findShapeAt(event.data.start, undefined, [], false, ctx.getScale());
  if (!movingShape) return;

  const anchorP = getAttachmentAnchorPoint(subShapeComposite, movingShape);
  const diff = sub(event.data.current, event.data.start);
  const movedAnchorP = add(anchorP, diff);

  const targetLine = shapeComposite.findShapeAt(movedAnchorP, { shapeType: "line" }, movingIds, false, ctx.getScale());
  if (!targetLine || !isLineShape(targetLine)) return;

  return {
    type: "stack-resume",
    getState: () => ctx.states.newMovingOnLineState({ lineId: targetLine.id, shapeId: movingShape.id }),
  };
}
