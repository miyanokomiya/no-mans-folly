import { useCallback } from "react";
import * as Y from "yjs";
import { generateUuid } from "./utils/random";
import { AppCanvas } from "./components/AppCanvas";
import {
  AppCanvasContext,
  AppStateMachineContext,
  createInitialEntities,
  createStateMachineContext,
} from "./contexts/AppCanvasContext";
import { createShape, getCommonStruct } from "./shapes/index";
import { newShapeStore } from "./stores/shapes";
import { newLayerStore } from "./stores/layers";
import { newDiagramStore } from "./stores/diagram";
import { newSheetStore } from "./stores/sheets";

const yDiagramDoc = new Y.Doc();
const diagramStore = newDiagramStore({ ydoc: yDiagramDoc });
const sheetStore = newSheetStore({ ydoc: yDiagramDoc });
const ySheetDoc = new Y.Doc();
const layerStore = newLayerStore({ ydoc: ySheetDoc });
const shapeStore = newShapeStore({ ydoc: ySheetDoc });

const acctx = {
  diagramStore,
  sheetStore,
  layerStore,
  shapeStore,
  getStyleScheme: () => ({
    selectionPrimary: { r: 200, g: 0, b: 0, a: 1 },
    selectionSecondaly: { r: 0, g: 0, b: 200, a: 1 },
  }),
};
createInitialEntities(acctx);

const undoManager = new Y.UndoManager(
  // Must be ones in the same Y.Doc
  [layerStore.getScope(), shapeStore.getScope()],
  {
    captureTimeout: 0,
  }
);
undoManager.clear();

const smctx = createStateMachineContext({
  getTimestamp: Date.now,
  generateUuid,
  getStyleScheme: acctx.getStyleScheme,
});

function App() {
  const onClick = useCallback(() => {
    const id = generateUuid();
    const rand = Math.random();
    const v = 600;
    const shape =
      rand < 0.5
        ? createShape(getCommonStruct, "rectangle", {
            id,
            p: { x: Math.random() * v, y: Math.random() * v },
            rotation: Math.random() * Math.PI * 2,
          })
        : createShape(getCommonStruct, "ellipse", {
            id,
            p: { x: Math.random() * v, y: Math.random() * v },
            rotation: Math.random() * Math.PI * 2,
          });
    shapeStore.addEntity(shape);
  }, []);

  const onUndo = useCallback(() => {
    undoManager.undo();
  }, []);

  const onRedo = useCallback(() => {
    undoManager.redo();
  }, []);

  return (
    <AppCanvasContext.Provider value={acctx}>
      <AppStateMachineContext.Provider value={smctx}>
        <div className="relative">
          <div className="w-screen h-screen">
            <AppCanvas />
          </div>
          <div className="absolute top-0 left-0">
            <button onClick={onClick}>Add</button>
            <button onClick={onUndo}>Undo</button>
            <button onClick={onRedo}>Redo</button>
          </div>
        </div>
      </AppStateMachineContext.Provider>
    </AppCanvasContext.Provider>
  );
}

export default App;
