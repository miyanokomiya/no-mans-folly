import { add, sub } from "okageo";
import { isLineShape } from "../../../shapes/line";
import { getAttachmentAnchorPoint } from "../../lineAttachmentHandler";
import { PointerMoveEvent, TransitionValue } from "../core";
import { AppCanvasStateContext } from "./core";
import { newMovingOnLineState } from "./lines/movingOnLineState";
import { newShapeComposite } from "../../shapeComposite";

export function handlePointerMoveOnLine(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
): TransitionValue<AppCanvasStateContext> {
  if (event.data.ctrl) return;
  if (movingIds.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  const movingAllIdSet = new Set(shapeComposite.getAllBranchMergedShapes(movingIds).map((s) => s.id));
  const subShapeComposite = newShapeComposite({
    shapes: shapeComposite.shapes.filter((s) => movingAllIdSet.has(s.id)),
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
    getState: () => newMovingOnLineState({ lineId: targetLine.id, shapeId: movingShape.id }),
  };
}
