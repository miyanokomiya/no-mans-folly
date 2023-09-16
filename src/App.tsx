import { generateUuid } from "./utils/random";
import { AppCanvas } from "./components/AppCanvas";
import { AppToolbar } from "./components/AppToolbar";
import { AppCanvasContext, AppStateMachineContext, createStateMachineContext } from "./contexts/AppCanvasContext";
import { AppFootbar } from "./components/AppFootbar";
import { createStyleScheme } from "./models/factories";
import { SheetList } from "./components/sheets/SheetList";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SheetConfigPanel } from "./components/SheetConfigPanel";
import { useAutoSave, usePersistence } from "./composables/persistence";
import { getSheetURL } from "./utils/route";
import { AppHeader } from "./components/AppHeader";

function App() {
  const {
    diagramStore,
    sheetStore,
    layerStore,
    shapeStore,
    documentStore,
    undoManager,
    ready,
    initSheet,
    openDiagramFromLocal,
    saveAllToLocal,
    saveDiagramToLocal,
    saveSheetToLocal,
    canSyncoLocal,
  } = usePersistence({ generateUuid });

  const [autoSaved, setAutoSaved] = useState(0);
  const onAutoSaved = useCallback(() => {
    setAutoSaved(Date.now());
  }, []);
  const resetAutoSaved = useCallback(() => {
    setAutoSaved(0);
  }, []);

  const autoSave = useAutoSave({
    diagramStore,
    sheetStore,
    layerStore,
    shapeStore,
    documentStore,
    enable: canSyncoLocal,
    saveDiagramToLocal,
    saveSheetToLocal,
    onSave: onAutoSaved,
  });

  useEffect(() => {
    return sheetStore.watchSelected(async () => {
      const sheet = sheetStore.getSelectedSheet();
      if (!ready || !sheet) return;

      await autoSave.flush();
      resetAutoSaved();
      await initSheet(sheet.id);
      history.replaceState(null, "", getSheetURL(sheet.id));
    });
  }, [sheetStore, ready, autoSave.flush, resetAutoSaved]);

  const acctx = useMemo(() => {
    const context = {
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
    return context;
  }, [diagramStore, sheetStore, layerStore, shapeStore, documentStore, undoManager]);

  const smctx = useMemo(() => {
    return createStateMachineContext({
      getTimestamp: Date.now,
      generateUuid,
      getStyleScheme: acctx.getStyleScheme,
    });
  }, [acctx.getStyleScheme]);

  const onClickOpen = useCallback(async () => {
    await openDiagramFromLocal();
  }, [openDiagramFromLocal]);

  const onClickSave = useCallback(async () => {
    await saveAllToLocal();
  }, [saveAllToLocal]);

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
          <div className="absolute top-8 flex">
            <SheetList />
            <SheetConfigPanel />
          </div>
          <div className="absolute left-0 top-0 flex">
            <AppHeader
              onClickOpen={onClickOpen}
              onClickSave={onClickSave}
              canSyncoLocal={canSyncoLocal}
              autoSaved={autoSaved}
            />
          </div>
        </div>
      </AppStateMachineContext.Provider>
    </AppCanvasContext.Provider>
  );
}

export default App;
