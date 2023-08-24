import type { ModeStateBase, ModeStateEvent, ModeStateEventBase } from "../core";
import type { CanvasStateContext } from "../commons";
import { Shape } from "../../../models";
import { IVec2 } from "okageo";
import { GetShapeStruct } from "../../../shapes";

export interface AppCanvasStateContext extends CanvasStateContext {
  getShapeMap: () => { [id: string]: Shape };
  getSelectedShapeIdMap: () => { [id: string]: true };
  getLastSelectedShapeId: () => string | undefined;
  getShapeAt: (p: IVec2) => Shape | undefined;
  selectShape: (id: string, ctrl?: boolean) => void;
  clearAllSelected: () => void;
  deleteShapes: (ids: string[]) => void;
  patchShapes: (val: { [id: string]: Partial<Shape> }) => void;
  getTmpShapeMap: () => { [id: string]: Partial<Shape> };
  setTmpShapeMap: (val: { [id: string]: Partial<Shape> }) => void;

  getShapeStruct: GetShapeStruct;
}

export type AppCanvasState = ModeStateBase<AppCanvasStateContext, AppCanvasEvent>;

export type AppCanvasEvent = ModeStateEvent | ChangeSelectionEvent | UpdateShapeEvent;

interface ChangeSelectionEvent extends ModeStateEventBase {
  type: "selection";
}

interface UpdateShapeEvent extends ModeStateEventBase {
  type: "shape-updated";
}
