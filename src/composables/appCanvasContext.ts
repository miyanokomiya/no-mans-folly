import { createContext } from "react";
import { newShapeStore } from "../stores/shapes";
import { newLayerStore } from "../stores/layers";

interface IAppCanvasContext {
  layerStore: ReturnType<typeof newLayerStore>;
  shapeStore: ReturnType<typeof newShapeStore>;
}

export const AppCanvasContext = createContext<IAppCanvasContext>(undefined as any);
