import type { ModeStateBase, ModeStateEvent, ModeStateEventBase } from "../core";
import type { CanvasStateContext } from "../commons";

export type AppCanvasStateContext = CanvasStateContext;

export type AppCanvasState = ModeStateBase<AppCanvasStateContext, AppCanvasEvent>;

export type AppCanvasEvent = ModeStateEvent | ChangeSelectionEvent;

interface ChangeSelectionEvent extends ModeStateEventBase {
  type: "selection";
}
