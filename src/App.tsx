import { generateUuid } from "./utils/random";
import { AppCanvas } from "./components/AppCanvas";
import { AppToolbar } from "./components/AppToolbar";
import { AppFootbar } from "./components/AppFootbar";
import { createStyleScheme } from "./models/factories";
import { SheetList } from "./components/sheets/SheetList";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePersistence } from "./hooks/persistence";
import { getSheetURL } from "./utils/route";
import { AppHeader } from "./components/AppHeader";
import { AppCanvasProvider } from "./contexts/AppContext";
import { AppRightPanel } from "./components/AppRightPanel";
import { EntranceDialog } from "./components/navigations/EntranceDialog";
import { newUserSettingStore } from "./stores/userSettingStore";
import { IAppCanvasContext } from "./contexts/AppCanvasContext";

const queryParameters = new URLSearchParams(window.location.search);
const noIndexedDB = !queryParameters.get("indexeddb");

const USER_SETTING_KEY = "userSetting";

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

  const userSetting = useMemo(() => {
    const userSettingStr = localStorage.getItem(USER_SETTING_KEY);
    return newUserSettingStore({ initialValue: userSettingStr ? JSON.parse(userSettingStr) : {} });
  }, []);
  useEffect(() => {
    return userSetting.watch(() => {
      localStorage.setItem(USER_SETTING_KEY, JSON.stringify(userSetting.getState()));
    });
  }, [userSetting]);

  const acctx = useMemo<IAppCanvasContext>(() => {
    const context = {
      userSettingStore: userSetting,
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
    return await openDiagramFromLocal();
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

  const [rightPanel, setRightPanel] = useState("");
  const rightPanelWidth = 300;
  const floatRightStyle = rightPanel ? { transform: `translateX(${-rightPanelWidth + 16}px)` } : {};
  const floatRightPanelStyle = rightPanel ? { transform: `translateX(${-rightPanelWidth}px)` } : {};
  const handleRightPanel = useCallback((key: string) => {
    setRightPanel((v) => (v === key ? "" : key));
  }, []);

  const [openEntranceDialog, setOpenEntranceDialog] = useState(noIndexedDB);
  const closeEntranceDialog = useCallback(() => {
    setOpenEntranceDialog(false);
  }, []);
  const handleOpenWorkspace = useCallback(async () => {
    const result = await onClickOpen();
    if (result) {
      closeEntranceDialog();
    }
  }, [onClickOpen, closeEntranceDialog]);

  // FIXME: Reduce screen blinking due to sheets transition. "bg-black" mitigates it a bit.
  return (
    <AppCanvasProvider acctx={acctx} getAssetAPI={getAssetAPI}>
      <EntranceDialog open={openEntranceDialog} onClose={closeEntranceDialog} onOpenWorkspace={handleOpenWorkspace} />
      <div className={"relative" + (openEntranceDialog ? " opacity-50" : "")}>
        <div className="w-screen h-screen bg-gray">{ready ? <AppCanvas /> : undefined}</div>
        <div
          className={"absolute top-2 bottom-2 left-full bg-white transition-transform"}
          style={{ width: rightPanelWidth, ...floatRightPanelStyle }}
        >
          <AppRightPanel selected={rightPanel} onSelect={handleRightPanel} />
        </div>
        <div
          className="absolute right-4 transition-transform"
          style={{ top: "50%", transform: "translateY(-50%)" + (floatRightStyle.transform ?? "") }}
        >
          <AppToolbar />
        </div>
        <div className="absolute bottom-2 right-4 transition-transform" style={floatRightStyle}>
          <AppFootbar />
        </div>
        <div className="absolute top-8 flex">
          <SheetList />
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
