import type { ModeStateBase, ModeStateEventBase } from "../core";
import type { CanvasStateContext, CanvasStateEvent } from "../commons";
import type { AssetAPI } from "../../../hooks/persistence";
import { Shape } from "../../../models";
import { IVec2 } from "okageo";
import { GetShapeStruct } from "../../../shapes";
import { DocAttrInfo, DocAttributes, DocDelta, DocOutput } from "../../../models/document";
import { CursorPositionInfo } from "../../../stores/documents";
import { ShapeComposite } from "../../shapeComposite";
import { Grid } from "../../grid";
import { ImageStore } from "../../imageStore";
import { LinkInfo } from "../types";

export interface AppCanvasStateContext extends CanvasStateContext {
  getShapeComposite: () => ShapeComposite;
  getShapes: () => Shape[];
  getSelectedShapeIdMap: () => { [id: string]: true };
  getLastSelectedShapeId: () => string | undefined;
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
  getShowEmojiPicker: () => boolean;
  setShowEmojiPicker: (val: boolean, p?: IVec2) => void; // "p" is handled same as "setTextEditorPosition"
  setTextEditorPosition: (p: IVec2) => void;
  getDocumentMap: () => { [id: string]: DocOutput };
  getTmpDocMap: () => { [id: string]: DocDelta };
  setTmpDocMap: (val: { [id: string]: DocDelta }) => void;
  patchDocuments: (val: { [id: string]: DocDelta }, shapes?: { [id: string]: Partial<Shape> }) => void;
  patchDocDryRun: (id: string, val: DocDelta) => DocOutput;
  setCurrentDocAttrInfo: (info: DocAttrInfo) => void;
  setLinkInfo: (val?: LinkInfo) => void;
  getLinkInfo: () => LinkInfo | undefined;
  createCursorPosition: (id: string, index: number) => CursorPositionInfo | undefined;
  retrieveCursorPosition: (info?: CursorPositionInfo) => number;

  assetAPI: AssetAPI;
  getImageStore: () => ImageStore;
}

export type AppCanvasState = ModeStateBase<AppCanvasStateContext, AppCanvasEvent>;

export type AppCanvasEvent =
  | CanvasStateEvent
  | ChangeSelectionEvent
  | UpdateShapeEvent
  | UpdateTmpShapeEvent
  | TextInputEvent
  | TextStyleEvent
  | ContextMenuItemEvent
  | FileDropEvent
  | CloseEmojiPicker;

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

interface UpdateTmpShapeEvent extends ModeStateEventBase {
  type: "tmp-shape-updated";
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
    draft?: boolean;
  };
}

export interface ContextMenuItemEvent extends ModeStateEventBase {
  type: "contextmenu-item";
  data: {
    key: string;
    meta?: any;
  };
}

export interface FileDropEvent extends ModeStateEventBase {
  type: "file-drop";
  data: {
    files: FileList;
    point: IVec2;
  };
}

export interface CloseEmojiPicker extends ModeStateEventBase {
  type: "close-emoji-picker";
}
