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
import { isFileAccessAvailable, isTouchDevice } from "./utils/devices";
import { GoogleDriveFolder } from "./google/types";
import { newDriveAccess } from "./google/composables/driveAccess";
import { FileAccess, newFileAccess } from "./composables/fileAcess";
import { LoadingDialog } from "./components/navigations/LoadingDialog";

const queryParameters = new URLSearchParams(window.location.search);
const noIndexedDB = !queryParameters.get("indexeddb");

const USER_SETTING_KEY = "userSetting";

function App() {
  const localFileAcess = useMemo(() => newFileAccess(), []);
  const [fileAcess, setFileAcess] = useState<FileAccess>(localFileAcess);
  const [googleMode, setGoogleMode] = useState<"" | "picked" | "loading" | "loaded">("");

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
    assetAPI,
  } = usePersistence({ generateUuid, fileAcess });

  useEffect(() => {
    return sheetStore.watchSelected(async () => {
      const sheet = sheetStore.getSelectedSheet();
      if (!ready || !sheet) return;

      await initSheet(sheet.id);
      history.replaceState(null, "", getSheetURL(sheet.id));
    });
  }, [initSheet, sheetStore, ready]);

  const userSetting = useMemo(() => {
    const userSettingStr = localStorage.getItem(USER_SETTING_KEY);
    const touchDevice = isTouchDevice();
    return newUserSettingStore({
      initialValue: userSettingStr
        ? JSON.parse(userSettingStr)
        : {
            leftDragAction: touchDevice ? "pan" : undefined,
            wheelAction: touchDevice ? "pan" : undefined,
          },
    });
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
  }, [diagramStore, sheetStore, layerStore, shapeStore, documentStore, undoManager, userSetting]);

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
  const floatRightStyle = rightPanel ? { transform: `translateX(${-rightPanelWidth}px)` } : {};
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

  const fileAccessAvailable = isFileAccessAvailable();

  const handleGoogleFolderSelect = useCallback((folder: GoogleDriveFolder, token: string) => {
    setOpenEntranceDialog(false);
    const access = newDriveAccess({ folderId: folder.id, token });
    setFileAcess(access);
    setGoogleMode("picked");
  }, []);

  useEffect(() => {
    if (googleMode !== "picked") return;

    setGoogleMode("loading");
    openDiagramFromLocal()
      .then(() => {
        setGoogleMode("loaded");
      })
      .catch((e) => {
        console.error(e);
        setGoogleMode("");
      });
  }, [googleMode, openDiagramFromLocal]);

  const loading = !ready || googleMode === "loading";

  // FIXME: Reduce screen blinking due to sheets transition. "bg-black" mitigates it a bit.
  return (
    <AppCanvasProvider acctx={acctx} assetAPI={assetAPI}>
      <EntranceDialog
        open={openEntranceDialog}
        onClose={closeEntranceDialog}
        onOpenWorkspace={handleOpenWorkspace}
        onGoogleFolderSelect={handleGoogleFolderSelect}
      />
      <LoadingDialog open={loading} />
      <div className="relative">
        <div className="w-screen h-screen bg-gray">{ready ? <AppCanvas /> : undefined}</div>
        <div
          className={"fixed top-2 bottom-2 left-full bg-white transition-transform"}
          style={{ width: rightPanelWidth, ...floatRightPanelStyle }}
        >
          <AppRightPanel selected={rightPanel} onSelect={handleRightPanel} />
        </div>
        <div
          className="fixed right-7 transition-transform"
          style={{ top: "50%", transform: "translateY(-50%)" + (floatRightStyle.transform ?? "") }}
        >
          <AppToolbar />
        </div>
        <div className="fixed bottom-2 right-4 transition-transform" style={floatRightStyle}>
          <AppFootbar />
        </div>
        {fileAccessAvailable ? (
          <div className="fixed top-8 flex">
            <SheetList />
          </div>
        ) : undefined}
        <div className="fixed left-0 top-0 flex">
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
