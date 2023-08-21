import { createContext } from "react";
import type { newShapeStore } from "../stores/shapes";
import type { newLayerStore } from "../stores/layers";
import type { newDiagramStore } from "../stores/diagram";
import type { newSheetStore } from "../stores/sheets";
import { generateUuid } from "../utils/random";

interface IAppCanvasContext {
  diagramStore: ReturnType<typeof newDiagramStore>;
  sheetStore: ReturnType<typeof newSheetStore>;
  layerStore: ReturnType<typeof newLayerStore>;
  shapeStore: ReturnType<typeof newShapeStore>;
}

export const AppCanvasContext = createContext<IAppCanvasContext>(undefined as any);

export function createInitialEntities(acctx: IAppCanvasContext, generateId = generateUuid) {
  acctx.diagramStore.patchEntity({ id: generateId(), findex: "0" });
  const sheetId = generateId();
  acctx.sheetStore.addEntity({ id: sheetId, findex: "0", name: "New Sheet" });
  acctx.sheetStore.selectSheet(sheetId);
  const layerId = generateId();
  acctx.layerStore.addEntity({ id: layerId, findex: "0", name: "New Layer" });
  acctx.layerStore.selectLayer(layerId);
}
