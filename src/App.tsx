import { generateUuid } from "./utils/random";
import { AppCanvas } from "./components/AppCanvas";
import { AppToolbar } from "./components/AppToolbar";
import { AppFootbar } from "./components/AppFootbar";
import { createStyleScheme } from "./models/factories";
import { SheetList } from "./components/sheets/SheetList";
import { useCallback, useEffect, useMemo } from "react";
import { SheetConfigPanel } from "./components/SheetConfigPanel";
import { usePersistence } from "./composables/persistence";
import { getSheetURL } from "./utils/route";
import { AppHeader } from "./components/AppHeader";
import { AppCanvasProvider } from "./contexts/AppContext";

function App() {
  const {
    diagramStore,
    sheetStore,
    layerStore,
    shapeStore,
    documentStore,
    undoManager,
    ready,
    savePending,
    initSheet,
    openDiagramFromLocal,
    saveAllToLocal,
    mergeAllWithLocal,
    canSyncoLocal,
    getAssetAPI,
  } = usePersistence({ generateUuid });

  useEffect(() => {
    return sheetStore.watchSelected(async () => {
      const sheet = sheetStore.getSelectedSheet();
      if (!ready || !sheet) return;

      await initSheet(sheet.id);
      history.replaceState(null, "", getSheetURL(sheet.id));
    });
  }, [sheetStore, ready]);

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

  const onClickOpen = useCallback(async () => {
    await openDiagramFromLocal();
  }, [openDiagramFromLocal]);

  const onClickSave = useCallback(async () => {
    await saveAllToLocal();
  }, [saveAllToLocal]);

  const onClickMerge = useCallback(async () => {
    await mergeAllWithLocal();
  }, [mergeAllWithLocal]);

  const saving = useMemo(() => {
    return Object.values(savePending).some((v) => v);
  }, [savePending]);

  // FIXME: Reduce screen blinking due to sheets transition. "bg-black" mitigates it a bit.
  return (
    <AppCanvasProvider acctx={acctx} getAssetAPI={getAssetAPI}>
      <div className="relative">
        <div className="w-screen h-screen bg-gray">{ready ? <AppCanvas /> : undefined}</div>
        <div className="absolute right-4" style={{ top: "50%", transform: "translateY(-50%)" }}>
          <AppToolbar />
        </div>
        <div className="absolute right-4 bottom-2">
          <AppFootbar />
        </div>
        <div className="absolute top-8 flex">
          <SheetList />
          <div className="absolute top-0 flex" style={{ left: 116 }}>
            <SheetConfigPanel />
          </div>
        </div>
        <div className="absolute left-0 top-0 flex">
          <AppHeader
            onClickOpen={onClickOpen}
            onClickSave={onClickSave}
            onClickMerge={onClickMerge}
            canSyncoLocal={canSyncoLocal}
            saving={saving}
          />
        </div>
      </div>
    </AppCanvasProvider>
  );
}

export default App;
