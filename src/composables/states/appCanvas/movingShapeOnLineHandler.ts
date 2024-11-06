import { add, sub } from "okageo";
import { getConnections, isLineShape } from "../../../shapes/line";
import { getAttachmentAnchorPoint } from "../../lineAttachmentHandler";
import { PointerMoveEvent, TransitionValue } from "../core";
import { AppCanvasStateContext } from "./core";
import { newShapeComposite } from "../../shapeComposite";
import { Shape } from "../../../models";

export function handlePointerMoveOnLine(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
): TransitionValue<AppCanvasStateContext> {
  if (event.data.ctrl || movingIds.length === 0) return;

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

  const isValidLine = (shape: Shape): boolean => {
    if (!shape || !isLineShape(shape)) return false;

    // If temporary data of this line exists, it means this line depends on moving shapes.
    if (ctx.getTmpShapeMap()[shape.id]) return false;

    // Exclude directly connected lines.
    // => Indirectly connected ones are still troublesome but checking them all would be costly.
    // => Directly connected ones are likely close to the moving shape.
    if (getConnections(shape).some((c) => c?.id === movingShape.id)) return false;

    return true;
  };

  const exludeIds = movingIds.concat();
  let targetLine = shapeComposite.findShapeAt(movedAnchorP, { shapeType: "line" }, exludeIds, false, ctx.getScale());
  while (targetLine) {
    if (isValidLine(targetLine)) {
      break;
    }
    exludeIds.push(targetLine.id);
    targetLine = shapeComposite.findShapeAt(movedAnchorP, { shapeType: "line" }, exludeIds, false, ctx.getScale());
  }
  if (!targetLine) return;

  // When the latest target is attached, activate MovingOnLine state regardless of the setting.
  if (ctx.getUserSetting().attachToLine !== "on" && !shapeComposite.mergedShapeMap[movingShape.id].attachment) return;

  return {
    type: "stack-resume",
    getState: () => ctx.states.newMovingOnLineState({ lineId: targetLine.id, shapeId: movingShape.id }),
  };
}
