import { useCallback } from "react";
import * as Y from "yjs";
import { newShapeStore } from "./stores/shapes.ts";
import { generateUuid } from "./utils/random.ts";
import { AppCanvas } from "./components/AppCanvas.tsx";
import { AppCanvasContext } from "./composables/appCanvasContext.ts";

const ydoc = new Y.Doc();
const shapeStore = newShapeStore({ ydoc });
const acctx = { shapeStore };

function App() {
  const onClick = useCallback(() => {
    const id = generateUuid();
    shapeStore.addEntity({ id, findex: id });
  }, []);

  return (
    <AppCanvasContext.Provider value={acctx}>
      <div>
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <button onClick={onClick}>Add</button>
      </div>
      <AppCanvas />
    </AppCanvasContext.Provider>
  );
}

export default App;
