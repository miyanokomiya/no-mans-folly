import { createContext } from "react";
import type { ShapeStore } from "../stores/shapes";
import type { LayerStore } from "../stores/layers";
import type { DiagramStore } from "../stores/diagram";
import type { SheetStore } from "../stores/sheets";
import { AppCanvasStateContext } from "../composables/states/appCanvas/core";
import { getCommonStruct } from "../shapes";
import { StyleScheme, UserSetting } from "../models";
import { DocumentStore } from "../stores/documents";
import { newShapeComposite } from "../composables/shapeComposite";
import { newGrid } from "../composables/grid";
import { newImageStore } from "../composables/imageStore";
import { UserSettingStore } from "../stores/userSettingStore";
import { ToastMessage } from "../composables/states/types";
import { stateGenerators } from "../composables/states/appCanvas";
import { AssetAPI, newMemoryAssetAPI } from "../composables/assetAPI";

export interface IAppCanvasContext {
  workspaceType: string;
  diagramStore: DiagramStore;
  sheetStore: SheetStore;
  layerStore: LayerStore;
  shapeStore: ShapeStore;
  documentStore: DocumentStore;
  undoManager: AppUndoManager;
  getStyleScheme: () => StyleScheme;
  userSettingStore: UserSettingStore;
}

export interface AppUndoManager {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  watch: (fn: () => void) => () => void;
  setCaptureTimeout: (timeout?: number) => void;
}

export const AppCanvasContext = createContext<IAppCanvasContext>(undefined as any);

export function createInitialAppCanvasStateContext(arg: {
  getTimestamp: () => number;
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;
  getUserSetting?: () => UserSetting;
  patchUserSetting?: (patch: Partial<UserSetting>) => void;
  showToastMessage?: (val: ToastMessage) => void;
  assetAPI?: AssetAPI;
}): AppCanvasStateContext {
  return {
    getTimestamp: arg.getTimestamp,
    generateUuid: arg.generateUuid,
    getStyleScheme: arg.getStyleScheme,
    getUserSetting: arg.getUserSetting ?? (() => ({})),
    patchUserSetting: arg.patchUserSetting ?? (() => ({})),
    showToastMessage: arg.showToastMessage ?? (() => ({})),
    assetAPI: arg.assetAPI ?? newMemoryAssetAPI(),

    redraw() {},
    getRenderCtx: () => undefined,
    setViewport() {},
    zoomView: () => 1,
    setZoom: () => 1,
    getScale: () => 1,
    getViewRect: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    panView() {},
    scrollView() {},
    startDragging() {},
    stopDragging() {},
    getCursorPoint: () => ({ x: 0, y: 0 }),

    toView: (p) => p,
    showFloatMenu() {},
    hideFloatMenu() {},
    setContextMenuList() {},
    setCommandExams() {},
    setCursor() {},
    setLinkInfo() {},
    getLinkInfo: () => undefined,

    undo() {},
    redo() {},
    setCaptureTimeout() {},

    getSheets: () => [],
    getSelectedSheet: () => undefined,
    selectSheet: () => {},

    getShapeComposite: () => newShapeComposite({ shapes: [], getStruct: getCommonStruct }),
    getShapes: () => [],
    getSelectedShapeIdMap: () => ({}),
    getLastSelectedShapeId: () => undefined,
    selectShape() {},
    multiSelectShapes() {},
    clearAllSelected() {},
    addShapes() {},
    deleteShapes() {},
    patchShapes() {},
    updateShapes() {},
    setTmpShapeMap() {},
    getTmpShapeMap: () => ({}),
    pasteShapes() {},

    getShapeStruct: getCommonStruct,
    createFirstIndex: () => "",
    createLastIndex: () => "",

    getGrid: () => newGrid({ size: 100, range: { x: 0, y: 0, width: 100, height: 100 } }),

    startTextEditing() {},
    stopTextEditing() {},
    getShowEmojiPicker: () => false,
    setShowEmojiPicker() {},
    setTextEditorPosition() {},
    getDocumentMap: () => ({}),
    getTmpDocMap: () => ({}),
    setTmpDocMap() {},
    patchDocuments() {},
    patchDocDryRun: () => [],
    setCurrentDocAttrInfo() {},
    createCursorPosition: () => undefined,
    retrieveCursorPosition: () => 0,

    getImageStore: () => newImageStore(),

    states: stateGenerators,
  };
}
