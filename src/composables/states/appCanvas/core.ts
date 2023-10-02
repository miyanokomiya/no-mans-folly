import type { ModeStateBase, ModeStateEventBase } from "../core";
import type { CanvasStateContext, CanvasStateEvent } from "../commons";
import type { AssetAPI } from "../../persistence";
import { Shape } from "../../../models";
import { IVec2 } from "okageo";
import { GetShapeStruct } from "../../../shapes";
import { DocAttrInfo, DocAttributes, DocDelta, DocOutput } from "../../../models/document";
import { CursorPositionInfo } from "../../../stores/documents";
import { ShapeComposite } from "../../shapeComposite";
import { Grid } from "../../grid";
import { ImageStore } from "../../imageStore";

export interface AppCanvasStateContext extends CanvasStateContext {
  getShapeComposite: () => ShapeComposite;
  getShapes: () => Shape[];
  getShapeMap: () => { [id: string]: Shape };
  getSelectedShapeIdMap: () => { [id: string]: true };
  getLastSelectedShapeId: () => string | undefined;
  getShapeAt: (p: IVec2) => Shape | undefined;
  selectShape: (id: string, ctrl?: boolean) => void;
  multiSelectShapes: (ids: string[], ctrl?: boolean) => void;
  clearAllSelected: () => void;
  addShapes: (shapes: Shape[], docMap?: { [id: string]: DocDelta }, patch?: { [id: string]: Partial<Shape> }) => void;
  deleteShapes: (ids: string[], patch?: { [id: string]: Partial<Shape> }) => void;
  patchShapes: (val: { [id: string]: Partial<Shape> }) => void;
  getTmpShapeMap: () => { [id: string]: Partial<Shape> };
  setTmpShapeMap: (val: { [id: string]: Partial<Shape> }) => void;
  // Argument shapes have concurrent ids.
  pasteShapes: (shapes: Shape[], docs: [id: string, doc: DocOutput][], p?: IVec2) => void;

  getShapeStruct: GetShapeStruct;
  createFirstIndex: () => string;
  createLastIndex: () => string;

  getGrid: () => Grid;
  setGridDisabled: (val: boolean) => void;

  startTextEditing: () => void;
  stopTextEditing: () => void;
  setTextEditorPosition: (p: IVec2) => void;
  getDocumentMap: () => { [id: string]: DocOutput };
  patchDocuments: (val: { [id: string]: DocDelta }, shapes?: { [id: string]: Partial<Shape> }) => void;
  patchDocDryRun: (id: string, val: DocDelta) => DocOutput;
  setCurrentDocAttrInfo: (info: DocAttrInfo) => void;
  createCursorPosition: (id: string, index: number) => CursorPositionInfo | undefined;
  retrieveCursorPosition: (info?: CursorPositionInfo) => number;

  getAssetAPI: () => AssetAPI;
  getImageStore: () => ImageStore;
}

export type AppCanvasState = ModeStateBase<AppCanvasStateContext, AppCanvasEvent>;

export type AppCanvasEvent =
  | CanvasStateEvent
  | ChangeSelectionEvent
  | UpdateShapeEvent
  | TextInputEvent
  | TextStyleEvent
  | ContextMenuItemEvent
  | FileDropEvent;

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

export interface FileDropEvent extends ModeStateEventBase {
  type: "file-drop";
  data: {
    files: FileList;
    point: IVec2;
  };
}
