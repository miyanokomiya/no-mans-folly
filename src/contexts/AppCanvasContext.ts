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

export interface IAppCanvasContext {
  diagramStore: DiagramStore;
  sheetStore: SheetStore;
  layerStore: LayerStore;
  shapeStore: ShapeStore;
  documentStore: DocumentStore;
  undoManager: { undo: () => void; redo: () => void; setCaptureTimeout: (timeout?: number) => void };
  getStyleScheme: () => StyleScheme;
  userSettingStore: UserSettingStore;
}

export const AppCanvasContext = createContext<IAppCanvasContext>(undefined as any);

export function createInitialAppCanvasStateContext(arg: {
  getTimestamp: () => number;
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;
  getUserSetting?: () => UserSetting;
  getAssetAPI?: AppCanvasStateContext["getAssetAPI"];
}): AppCanvasStateContext {
  return {
    getTimestamp: arg.getTimestamp,
    generateUuid: arg.generateUuid,
    getStyleScheme: arg.getStyleScheme,
    getUserSetting: arg.getUserSetting ?? (() => ({})),
    getAssetAPI: arg.getAssetAPI ?? (() => ({ enabled: false })),

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
    showToastMessage() {},
    setCursor() {},
    setLinkInfo() {},
    getLinkInfo: () => undefined,

    undo() {},
    redo() {},
    setCaptureTimeout() {},

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
    setTmpShapeMap() {},
    getTmpShapeMap: () => ({}),
    pasteShapes() {},

    getShapeStruct: getCommonStruct,
    createFirstIndex: () => "",
    createLastIndex: () => "",

    getGrid: () => newGrid({ size: 100, range: { x: 0, y: 0, width: 100, height: 100 } }),
    setGridDisabled() {},

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
  };
}
