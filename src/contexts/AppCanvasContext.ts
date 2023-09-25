import { createContext } from "react";
import type { newShapeStore } from "../stores/shapes";
import type { newLayerStore } from "../stores/layers";
import type { newDiagramStore } from "../stores/diagram";
import type { newSheetStore } from "../stores/sheets";
import { newStateMachine } from "../composables/states/core";
import { newDefaultState } from "../composables/states/appCanvas/defaultState";
import { AppCanvasEvent, AppCanvasStateContext } from "../composables/states/appCanvas/core";
import { getCommonStruct } from "../shapes";
import { StyleScheme } from "../models";
import { newDocumentStore } from "../stores/documents";
import { newShapeComposite } from "../composables/shapeComposite";
import { newGrid } from "../composables/grid";
import { newImageStore } from "../composables/imageStore";

interface IAppCanvasContext {
  diagramStore: ReturnType<typeof newDiagramStore>;
  sheetStore: ReturnType<typeof newSheetStore>;
  layerStore: ReturnType<typeof newLayerStore>;
  shapeStore: ReturnType<typeof newShapeStore>;
  documentStore: ReturnType<typeof newDocumentStore>;
  undoManager: { undo: () => void; redo: () => void; setCaptureTimeout: (timeout?: number) => void };
  getStyleScheme: () => StyleScheme;
}

export const AppCanvasContext = createContext<IAppCanvasContext>(undefined as any);

interface IAppStateMachineContext {
  setCtx: (
    c: Omit<
      AppCanvasStateContext,
      "getTimestamp" | "generateUuid" | "getShapeStruct" | "getStyleScheme" | "getAssetAPI"
    >
  ) => void;
  getCtx: () => AppCanvasStateContext;
  stateMachine: ReturnType<typeof newStateMachine<AppCanvasStateContext, AppCanvasEvent>>;
}

export const AppStateMachineContext = createContext<IAppStateMachineContext>(undefined as any);

export function createStateMachineContext(arg: {
  getTimestamp: () => number;
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;
  getAssetAPI: AppCanvasStateContext["getAssetAPI"];
}) {
  let ctx = createInitialAppCanvasStateContext(arg);

  const setCtx: IAppStateMachineContext["setCtx"] = (c) => {
    ctx = { ...ctx, ...c };
  };

  const getCtx: IAppStateMachineContext["getCtx"] = () => ctx;

  return {
    setCtx,
    getCtx,
    stateMachine: newStateMachine(getCtx, newDefaultState),
  };
}

export function createInitialAppCanvasStateContext(arg: {
  getTimestamp: () => number;
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;
  getAssetAPI: AppCanvasStateContext["getAssetAPI"];
}): AppCanvasStateContext {
  return {
    getTimestamp: arg.getTimestamp,
    generateUuid: arg.generateUuid,
    getStyleScheme: arg.getStyleScheme,
    getAssetAPI: arg.getAssetAPI,

    getRenderCtx: () => undefined,
    setViewport() {},
    zoomView: () => 1,
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

    getShapeComposite: () => newShapeComposite({ shapes: [] }),
    getShapes: () => [],
    getShapeMap: () => ({}),
    getSelectedShapeIdMap: () => ({}),
    getLastSelectedShapeId: () => undefined,
    getShapeAt: () => undefined,
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

    startTextEditing() {},
    stopTextEditing() {},
    setTextEditorPosition() {},
    getDocumentMap: () => ({}),
    patchDocuments() {},
    patchDocDryRun: () => [],
    setCurrentDocAttrInfo() {},
    createCursorPosition: () => undefined,
    retrieveCursorPosition: () => 0,

    getImageStore: () => newImageStore(),
  };
}
