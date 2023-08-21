import { useCallback } from "react";
import * as Y from "yjs";
import { newShapeStore } from "./stores/shapes.ts";
import { generateUuid } from "./utils/random.ts";
import { AppCanvas } from "./components/AppCanvas.tsx";
import { AppCanvasContext } from "./composables/appCanvasContext.ts";
import { createShape, getCommonStruct } from "./shapes/index.ts";

// const yDiagramDoc = new Y.Doc();
const ySheetDoc = new Y.Doc();
const shapeStore = newShapeStore({ ydoc: ySheetDoc });
const acctx = { shapeStore };
const undoManager = new Y.UndoManager([shapeStore.getScope()], {
  captureTimeout: 0,
});

function App() {
  const onClick = useCallback(() => {
    const id = generateUuid();
    const shape = createShape(getCommonStruct, "rectangle", {
      id,
      p: { x: Math.random() * 200, y: Math.random() * 200 },
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
      <div>
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <button onClick={onClick}>Add</button>
        <button onClick={onUndo}>Undo</button>
        <button onClick={onRedo}>Redo</button>
      </div>
      <AppCanvas />
    </AppCanvasContext.Provider>
  );
}

export default App;
