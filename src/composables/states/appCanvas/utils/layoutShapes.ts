import { IVec2 } from "okageo";
import { Shape } from "../../../../models";
import { isAlignBoxShape } from "../../../../shapes/align/alignBox";
import { isTableShape } from "../../../../shapes/table/table";
import { BoundingBox } from "../../../boundingBox";
import { ModeStateEvent, TransitionValue } from "../../core";
import { AppCanvasStateContext } from "../core";

/**
 * Handles state transition among moving-in-layout states.
 * Passing "option.diff" to next state nagates rendering flickering.
 */
export function handleNextLayoutShape(
  ctx: AppCanvasStateContext,
  layoutShape?: Shape,
  currentId?: string,
  option?: { boundingBox?: BoundingBox; diff?: IVec2 },
): TransitionValue<AppCanvasStateContext, ModeStateEvent> {
  if (!layoutShape) return;
  if (layoutShape.id === currentId) return;
  if (isAlignBoxShape(layoutShape))
    return {
      type: "stacked-switch",
      getState: () => ctx.states.newMovingShapeInAlignState({ ...option, alignBoxId: layoutShape.id }),
    };
  if (isTableShape(layoutShape))
    return {
      type: "stacked-switch",
      getState: () => ctx.states.newMovingShapeInTableState({ ...option, tableId: layoutShape.id }),
    };
}
