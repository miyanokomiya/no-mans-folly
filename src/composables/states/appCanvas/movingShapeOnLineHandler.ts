import { add, sub } from "okageo";
import { getConnections, isLineShape } from "../../../shapes/line";
import { getAttachmentAnchorPoint } from "../../lineAttachmentHandler";
import { PointerMoveEvent, TransitionValue } from "../core";
import { AppCanvasStateContext } from "./core";
import { Shape } from "../../../models";

export function handlePointerMoveOnLine(
  ctx: AppCanvasStateContext,
  event: PointerMoveEvent,
  movingIds: string[],
  indexId: string,
): TransitionValue<AppCanvasStateContext> {
  if (event.data.ctrl || movingIds.length === 0) return;

  const shapeComposite = ctx.getShapeComposite();
  const movingShape = shapeComposite.shapeMap[indexId];
  if (!shapeComposite.canAttach(movingShape)) return;

  const subShapeComposite = shapeComposite.getSubShapeComposite([movingShape.id]);
  const anchorP = getAttachmentAnchorPoint(subShapeComposite, subShapeComposite.shapeMap[indexId]);
  const diff = sub(event.data.current, event.data.startAbs);
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
  const scope = { ...shapeComposite.getSelectionScope(shapeComposite.shapeMap[movingShape.id]), shapeType: "line" };
  let targetLine = shapeComposite.findShapeAt(movedAnchorP, scope, exludeIds, false, ctx.getScale(), true);
  while (targetLine) {
    if (isValidLine(targetLine)) {
      break;
    }
    exludeIds.push(targetLine.id);
    targetLine = shapeComposite.findShapeAt(movedAnchorP, scope, exludeIds, false, ctx.getScale(), true);
  }
  if (!targetLine) return;

  // When the latest target is attached, activate MovingOnLine state regardless of the setting.
  if (ctx.getUserSetting().attachToLine !== "on" && !shapeComposite.mergedShapeMap[movingShape.id].attachment) return;

  return {
    type: "stack-resume",
    getState: () => ctx.states.newMovingOnLineState({ lineId: targetLine.id, shapeId: movingShape.id }),
  };
}
