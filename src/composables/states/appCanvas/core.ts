import type { ModeStateBase, ModeStateEvent, ModeStateEventBase } from "../core";
import type { CanvasStateContext } from "../commons";
import { Shape } from "../../../models";
import { IVec2 } from "okageo";
import { GetShapeStruct } from "../../../shapes";

export interface AppCanvasStateContext extends CanvasStateContext {
  getShapeMap: () => { [id: string]: Shape };
  getSelectedShapeIdMap: () => { [id: string]: true };
  getShapeAt: (p: IVec2) => Shape | undefined;
  selectShape: (id: string, ctrl?: boolean) => void;
  clearAllSelected: () => void;

  getShapeStruct: GetShapeStruct;
}

export type AppCanvasState = ModeStateBase<AppCanvasStateContext, AppCanvasEvent>;

export type AppCanvasEvent = ModeStateEvent | ChangeSelectionEvent;

interface ChangeSelectionEvent extends ModeStateEventBase {
  type: "selection";
}
