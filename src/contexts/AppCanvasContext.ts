import { createContext } from "react";
import type { newShapeStore } from "../stores/shapes";
import type { newLayerStore } from "../stores/layers";
import type { newDiagramStore } from "../stores/diagram";
import type { newSheetStore } from "../stores/sheets";
import { AppCanvasStateContext } from "../composables/states/appCanvas/core";
import { getCommonStruct } from "../shapes";
import { StyleScheme } from "../models";
import { newDocumentStore } from "../stores/documents";
import { newShapeComposite } from "../composables/shapeComposite";
import { newGrid } from "../composables/grid";
import { newImageStore } from "../composables/imageStore";

export interface IAppCanvasContext {
  diagramStore: ReturnType<typeof newDiagramStore>;
  sheetStore: ReturnType<typeof newSheetStore>;
  layerStore: ReturnType<typeof newLayerStore>;
  shapeStore: ReturnType<typeof newShapeStore>;
  documentStore: ReturnType<typeof newDocumentStore>;
  undoManager: { undo: () => void; redo: () => void; setCaptureTimeout: (timeout?: number) => void };
  getStyleScheme: () => StyleScheme;
}

export const AppCanvasContext = createContext<IAppCanvasContext>(undefined as any);

export function createInitialAppCanvasStateContext(arg: {
  getTimestamp: () => number;
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;
  getAssetAPI?: AppCanvasStateContext["getAssetAPI"];
}): AppCanvasStateContext {
  return {
    getTimestamp: arg.getTimestamp,
    generateUuid: arg.generateUuid,
    getStyleScheme: arg.getStyleScheme,
    getAssetAPI: arg.getAssetAPI ?? (() => ({ enabled: false })),

    getRenderCtx: () => undefined,
    setViewport() {},
    zoomView: () => 1,
    setZoom: () => 1,
    getScale: () => 1,
    getViewRect: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    panView() {},
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
