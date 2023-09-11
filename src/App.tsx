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
import { SheetList } from "./components/sheets/SheetList";
import { useEffect, useState } from "react";
import { getSheetURL } from "./utils/route";
import { SheetConfigPanel } from "./components/SheetConfigPanel";

const yDiagramDoc = new Y.Doc();
const diagramStore = newDiagramStore({ ydoc: yDiagramDoc });
const sheetStore = newSheetStore({ ydoc: yDiagramDoc });

let ySheetDoc = new Y.Doc();
const layerStore = newLayerStore({ ydoc: ySheetDoc });
const shapeStore = newShapeStore({ ydoc: ySheetDoc });
const documentStore = newDocumentStore({ ydoc: ySheetDoc });

function createUndoManager() {
  return new Y.UndoManager(
    // Must be ones in the same Y.Doc
    [layerStore.getScope(), shapeStore.getScope(), documentStore.getScope()],
    {
      captureTimeout: 0,
    }
  );
}
let undoManager = createUndoManager();

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
createInitialEntities(acctx);

const smctx = createStateMachineContext({
  getTimestamp: Date.now,
  generateUuid,
  getStyleScheme: acctx.getStyleScheme,
});

const dbProviderDiagram = new IndexeddbPersistence("test-project-diagram", yDiagramDoc);

function App() {
  const [ready, setReady] = useState(false);
  const [dbProviderSheet, setDbProviderSheet] = useState<IndexeddbPersistence | undefined>();

  useEffect(() => {
    return sheetStore.watchSelected(() => {
      setReady(false);

      const sheet = sheetStore.getSelectedSheet();
      if (!sheet) return;

      undoManager.destroy();
      ySheetDoc.destroy();
      ySheetDoc = new Y.Doc();
      const dbProviderSheet = new IndexeddbPersistence(sheet.id, ySheetDoc);
      setDbProviderSheet(dbProviderSheet);
    });
  }, []);

  useEffect(() => {
    if (!dbProviderSheet) return;

    const onSheetLoaded = () => {
      const sheet = sheetStore.getSelectedSheet();
      if (!sheet) return;

      console.log("content from the database is loaded: sheet ", sheet.id);
      layerStore.refresh(ySheetDoc);
      shapeStore.refresh(ySheetDoc);
      documentStore.refresh(ySheetDoc);
      undoManager = createUndoManager();
      undoManager.clear();
      smctx.stateMachine.reset();
      history.replaceState(null, "", getSheetURL(sheet.id));

      setReady(true);
    };
    dbProviderSheet.on("synced", onSheetLoaded);
    return () => dbProviderSheet.off("synced", onSheetLoaded);
  }, [dbProviderSheet]);

  useEffect(() => {
    const onLoadDiagram = () => {
      console.log("content from the database is loaded: diagram");
      const queryParameters = new URLSearchParams(window.location.search);
      const sheetId = queryParameters.get("sheet");
      if (sheetId) {
        sheetStore.selectSheet(sheetId);
      } else {
        sheetStore.selectSheet(sheetStore.getEntities()[0].id);
      }
    };
    dbProviderDiagram.on("synced", onLoadDiagram);
    return () => dbProviderDiagram.off("synced", onLoadDiagram);
  }, []);

  // FIXME: Reduce screen blinking due to sheets transition. "bg-black" mitigates it a bit.
  return (
    <AppCanvasContext.Provider value={acctx}>
      <AppStateMachineContext.Provider value={smctx}>
        <div className="relative">
          <div className="w-screen h-screen bg-black">{ready ? <AppCanvas /> : undefined}</div>
          <div className="absolute right-4" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <AppToolbar />
          </div>
          <div className="absolute right-4 bottom-2">
            <AppFootbar />
          </div>
          <div className="absolute left-4 top-2 flex">
            <SheetList />
            <SheetConfigPanel />
          </div>
        </div>
      </AppStateMachineContext.Provider>
    </AppCanvasContext.Provider>
  );
}

export default App;
