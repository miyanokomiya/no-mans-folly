import type { ModeStateBase, ModeStateEventBase } from "../core";
import type { CanvasStateContext, CanvasStateEvent } from "../commons";
import { Shape } from "../../../models";
import { IVec2 } from "okageo";
import { GetShapeStruct } from "../../../shapes";
import { DocAttrInfo, DocAttributes, DocDelta, DocOutput } from "../../../models/document";

export interface AppCanvasStateContext extends CanvasStateContext {
  getShapeMap: () => { [id: string]: Shape };
  getSelectedShapeIdMap: () => { [id: string]: true };
  getLastSelectedShapeId: () => string | undefined;
  getShapeAt: (p: IVec2) => Shape | undefined;
  selectShape: (id: string, ctrl?: boolean) => void;
  multiSelectShapes: (ids: string[], ctrl?: boolean) => void;
  clearAllSelected: () => void;
  addShapes: (shapes: Shape[]) => void;
  deleteShapes: (ids: string[]) => void;
  patchShapes: (val: { [id: string]: Partial<Shape> }) => void;
  getTmpShapeMap: () => { [id: string]: Partial<Shape> };
  setTmpShapeMap: (val: { [id: string]: Partial<Shape> }) => void;

  getShapeStruct: GetShapeStruct;

  startTextEditing: () => void;
  stopTextEditing: () => void;
  setTextEditorPosition: (p: IVec2) => void;
  getDocumentMap: () => { [id: string]: DocOutput };
  patchDocuments: (val: { [id: string]: DocDelta }) => void;
  setCurrentDocAttrInfo: (info: DocAttrInfo) => void;
}

export type AppCanvasState = ModeStateBase<AppCanvasStateContext, AppCanvasEvent>;

export type AppCanvasEvent =
  | CanvasStateEvent
  | ChangeSelectionEvent
  | UpdateShapeEvent
  | TextInputEvent
  | TextStyleEvent;

interface ChangeSelectionEvent extends ModeStateEventBase {
  type: "selection";
}

interface UpdateShapeEvent extends ModeStateEventBase {
  type: "shape-updated";
}

interface TextInputEvent extends ModeStateEventBase {
  type: "text-input";
  data: {
    value: string;
    composition?: boolean;
  };
}

export interface TextStyleEvent extends ModeStateEventBase {
  type: "text-style";
  data: {
    value: DocAttributes;
    block?: boolean;
    doc?: boolean;
  };
}
