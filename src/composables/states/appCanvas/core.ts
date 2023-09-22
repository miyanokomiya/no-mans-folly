import type { ModeStateBase, ModeStateEventBase } from "../core";
import type { CanvasStateContext, CanvasStateEvent } from "../commons";
import { Shape } from "../../../models";
import { IVec2 } from "okageo";
import { GetShapeStruct } from "../../../shapes";
import { DocAttrInfo, DocAttributes, DocDelta, DocOutput } from "../../../models/document";
import { CursorPositionInfo } from "../../../stores/documents";

export interface AppCanvasStateContext extends CanvasStateContext {
  getShapes: () => Shape[];
  getShapeMap: () => { [id: string]: Shape };
  getSelectedShapeIdMap: () => { [id: string]: true };
  getLastSelectedShapeId: () => string | undefined;
  getShapeAt: (p: IVec2) => Shape | undefined;
  selectShape: (id: string, ctrl?: boolean) => void;
  multiSelectShapes: (ids: string[], ctrl?: boolean) => void;
  clearAllSelected: () => void;
  addShapes: (shapes: Shape[], docMap?: { [id: string]: DocDelta }) => void;
  deleteShapes: (ids: string[]) => void;
  patchShapes: (val: { [id: string]: Partial<Shape> }) => void;
  getTmpShapeMap: () => { [id: string]: Partial<Shape> };
  setTmpShapeMap: (val: { [id: string]: Partial<Shape> }) => void;
  // Argument shapes have concurrent ids.
  pasteShapes: (shapes: Shape[], docs: [id: string, doc: DocOutput][], p?: IVec2) => void;

  getShapeStruct: GetShapeStruct;
  createFirstIndex: () => string;
  createLastIndex: () => string;

  startTextEditing: () => void;
  stopTextEditing: () => void;
  setTextEditorPosition: (p: IVec2) => void;
  getDocumentMap: () => { [id: string]: DocOutput };
  patchDocuments: (val: { [id: string]: DocDelta }, shapes?: { [id: string]: Partial<Shape> }) => void;
  patchDocDryRun: (id: string, val: DocDelta) => DocOutput;
  setCurrentDocAttrInfo: (info: DocAttrInfo) => void;
  createCursorPosition: (id: string, index: number) => CursorPositionInfo | undefined;
  retrieveCursorPosition: (info?: CursorPositionInfo) => number;
}

export type AppCanvasState = ModeStateBase<AppCanvasStateContext, AppCanvasEvent>;

export type AppCanvasEvent =
  | CanvasStateEvent
  | ChangeSelectionEvent
  | UpdateShapeEvent
  | TextInputEvent
  | TextStyleEvent
  | ContextMenuItemEvent;

interface ChangeSelectionEvent extends ModeStateEventBase {
  type: "selection";
}

interface UpdateShapeEvent extends ModeStateEventBase {
  type: "shape-updated";
  data: {
    keys: Set<string>;
    text?: boolean;
  };
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

export interface ContextMenuItemEvent extends ModeStateEventBase {
  type: "contextmenu-item";
  data: {
    key: string;
  };
}
