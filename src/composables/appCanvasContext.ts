import { createContext } from "react";
import type { newShapeStore } from "../stores/shapes.ts";

export const AppCanvasContext = createContext<{
  shapeStore: ReturnType<typeof newShapeStore>;
}>(undefined as any);
