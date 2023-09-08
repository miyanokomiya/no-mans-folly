import { createContext } from "react";
import type { newShapeStore } from "../stores/shapes";
import type { newLayerStore } from "../stores/layers";
import type { newDiagramStore } from "../stores/diagram";
import type { newSheetStore } from "../stores/sheets";
import { generateUuid } from "../utils/random";
import { newStateMachine } from "../composables/states/core";
import { newDefaultState } from "../composables/states/appCanvas/defaultState";
import { AppCanvasEvent, AppCanvasStateContext } from "../composables/states/appCanvas/core";
import { getCommonStruct } from "../shapes";
import { StyleScheme } from "../models";
import { newDocumentStore } from "../stores/documents";
import { generateKeyBetween } from "fractional-indexing";

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

export function createInitialEntities(acctx: IAppCanvasContext, _generateId = generateUuid) {
  acctx.diagramStore.patchEntity({ id: "default", findex: generateKeyBetween(null, null) });
  const sheetId = "default";
  acctx.sheetStore.addEntity({ id: sheetId, findex: generateKeyBetween(null, null), name: "New Sheet" });
  acctx.sheetStore.selectSheet(sheetId);
  const layerId = "default";
  acctx.layerStore.addEntity({ id: layerId, findex: generateKeyBetween(null, null), name: "New Layer" });
  acctx.layerStore.selectLayer(layerId);
}

interface IAppStateMachineContext {
  setCtx: (
    c: Omit<AppCanvasStateContext, "getTimestamp" | "generateUuid" | "getShapeStruct" | "getStyleScheme">
  ) => void;
  getCtx: () => AppCanvasStateContext;
  stateMachine: ReturnType<typeof newStateMachine<AppCanvasStateContext, AppCanvasEvent>>;
}

export const AppStateMachineContext = createContext<IAppStateMachineContext>(undefined as any);

export function createStateMachineContext(arg: {
  getTimestamp: () => number;
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;
}) {
  let ctx: AppCanvasStateContext = {
    getTimestamp: arg.getTimestamp,
    generateUuid: arg.generateUuid,
    getStyleScheme: arg.getStyleScheme,

    getRenderCtx: () => undefined,
    setViewport() {},
    zoomView: () => 1,
    getScale: () => 1,
    panView() {},
    startDragging() {},
    stopDragging() {},
    getCursorPoint: () => ({ x: 0, y: 0}),

    toView: (p) => p,
    showFloatMenu() {},
    hideFloatMenu() {},
    setContextMenuList() {},
    setCommandExams() {},
    setCursor() {},

    undo() {},
    redo() {},
    setCaptureTimeout() {},

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

    startTextEditing() {},
    stopTextEditing() {},
    setTextEditorPosition() {},
    getDocumentMap: () => ({}),
    patchDocuments() {},
    setCurrentDocAttrInfo() {},
    createCursorPosition: () => undefined,
    retrieveCursorPosition: () => 0,
  };

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
