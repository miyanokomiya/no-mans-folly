import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { generateUuid } from "./utils/random";
import { AppCanvas } from "./components/AppCanvas";
import { AppToolbar } from "./components/AppToolbar";
import {
  AppCanvasContext,
  AppStateMachineContext,
  createInitialEntities,
  createStateMachineContext,
} from "./contexts/AppCanvasContext";
import { newShapeStore } from "./stores/shapes";
import { newLayerStore } from "./stores/layers";
import { newDiagramStore } from "./stores/diagram";
import { newSheetStore } from "./stores/sheets";
import { AppFootbar } from "./components/AppFootbar";
import { createStyleScheme } from "./models/factories";
import { newDocumentStore } from "./stores/documents";

const yDiagramDoc = new Y.Doc();
const dbProviderDiagram = new IndexeddbPersistence("test-project-diagram", yDiagramDoc);
dbProviderDiagram.on("synced", () => {
  console.log("content from the database is loaded: diagram");
});
const diagramStore = newDiagramStore({ ydoc: yDiagramDoc });
const sheetStore = newSheetStore({ ydoc: yDiagramDoc });

const ySheetDoc = new Y.Doc();
const dbProviderSheet = new IndexeddbPersistence("test-project-sheet", ySheetDoc);
dbProviderSheet.on("synced", () => {
  console.log("content from the database is loaded: sheet");
});
const layerStore = newLayerStore({ ydoc: ySheetDoc });
const shapeStore = newShapeStore({ ydoc: ySheetDoc });
const documentStore = newDocumentStore({ ydoc: ySheetDoc });
const undoManager = new Y.UndoManager(
  // Must be ones in the same Y.Doc
  [layerStore.getScope(), shapeStore.getScope(), documentStore.getScope()],
  {
    captureTimeout: 0,
  }
);
// undoManager.captureTimeout = 0;

const acctx = {
  diagramStore,
  sheetStore,
  layerStore,
  shapeStore,
  documentStore,
  getStyleScheme: () => createStyleScheme(),
  undoManager: {
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
    setCaptureTimeout: (timeout = 0) => {
      undoManager.captureTimeout = timeout;
    },
  },
};
undoManager.clear();
createInitialEntities(acctx);

const smctx = createStateMachineContext({
  getTimestamp: Date.now,
  generateUuid,
  getStyleScheme: acctx.getStyleScheme,
});

function App() {
  return (
    <AppCanvasContext.Provider value={acctx}>
      <AppStateMachineContext.Provider value={smctx}>
        <div className="relative">
          <div className="w-screen h-screen">
            <AppCanvas />
          </div>
          <div className="absolute right-4" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <AppToolbar />
          </div>
          <div className="absolute right-4 bottom-2">
            <AppFootbar />
          </div>
        </div>
      </AppStateMachineContext.Provider>
    </AppCanvasContext.Provider>
  );
}

export default App;
