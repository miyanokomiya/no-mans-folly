import { generateUuid } from "./utils/random";
import { AppCanvas } from "./components/AppCanvas";
import { AppToolbar } from "./components/AppToolbar";
import { AppFootbar } from "./components/AppFootbar";
import { createStyleScheme } from "./models/factories";
import { SheetList } from "./components/sheets/SheetList";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SheetConfigPanel } from "./components/SheetConfigPanel";
import { usePersistence } from "./composables/persistence";
import { getSheetURL } from "./utils/route";
import { AppHeader } from "./components/AppHeader";
import { AppCanvasProvider } from "./contexts/AppContext";
import { ShapeLibraryPanel } from "./components/ShapeLibraryPanel";

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
    clearDiagram,
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

  const onClickClear = useCallback(async () => {
    await clearDiagram();
  }, [clearDiagram]);

  const saving = useMemo(() => {
    return Object.values(savePending).some((v) => v);
  }, [savePending]);

  // TODO: Refactor to extract from App.tsx
  const [rightPanel, setRightPanel] = useState("");
  const floatRightClass = rightPanel ? " right-60" : " right-4";
  const floatRightPanelClass = rightPanel ? " right-0" : " left-full";
  const handleRightPanel = useCallback((key: string) => {
    setRightPanel((v) => (v === key ? "" : key));
  }, []);

  // FIXME: Reduce screen blinking due to sheets transition. "bg-black" mitigates it a bit.
  return (
    <AppCanvasProvider acctx={acctx} getAssetAPI={getAssetAPI}>
      <div className="relative">
        <div className="w-screen h-screen bg-gray">{ready ? <AppCanvas /> : undefined}</div>
        <div className={"absolute top-2 bottom-2 bg-white" + floatRightPanelClass}>
          <div
            className="absolute top-12 left-0 bg-white w-6 h-16 border rounded flex items-center justify-center"
            style={{ transform: "translateX(calc(-100%))" }}
          >
            <button type="button" className="rotate-90" onClick={() => handleRightPanel("icons")}>
              Icons
            </button>
          </div>
          <div className="w-60 h-full overflow-auto p-2">
            <ShapeLibraryPanel />
          </div>
        </div>
        <div className={"absolute" + floatRightClass} style={{ top: "50%", transform: "translateY(-50%)" }}>
          <AppToolbar />
        </div>
        <div className={"absolute bottom-2" + floatRightClass}>
          <AppFootbar />
        </div>
        <div className="absolute top-8 flex">
          <SheetList />
        </div>
        <div className={"absolute top-2" + floatRightClass}>
          <SheetConfigPanel />
        </div>
        <div className="absolute left-0 top-0 flex">
          <AppHeader
            onClickOpen={onClickOpen}
            onClickSave={onClickSave}
            onClickMerge={onClickMerge}
            onClickClear={onClickClear}
            canSyncoLocal={canSyncoLocal}
            saving={saving}
          />
        </div>
      </div>
    </AppCanvasProvider>
  );
}

export default App;
