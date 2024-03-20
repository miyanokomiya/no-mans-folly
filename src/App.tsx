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
import { isTouchDevice } from "./utils/devices";
import { GoogleDriveFolder } from "./google/types";
import { newDriveAccess } from "./google/composables/driveAccess";
import { FileAccess, newFileAccess } from "./composables/fileAccess";
import { LoadingDialog } from "./components/navigations/LoadingDialog";
import { WorkspacePickerDialog } from "./components/navigations/WorkspacePickerDialog";
import { useEffectOnce, useIncrementalKeyMemo } from "./hooks/utils";

const queryParameters = new URLSearchParams(window.location.search);
const noIndexedDB = !queryParameters.get("indexeddb");
const googleAvailable = !!queryParameters.get("google");

const USER_SETTING_KEY = "userSetting";

function App() {
  const [fileAccess, setFileAccess] = useState<FileAccess>(useMemo(() => newFileAccess(), []));
  const canPersist = fileAccess.hasHnadle() || !noIndexedDB;

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
    initDiagram,
    openDiagramFromWorkspace,
    clearDiagram,
    saveToWorkspace,
    canSyncWorkspace,
    assetAPI,
    syncStatus,
  } = usePersistence({ generateUuid, fileAccess });

  useEffectOnce(() => {
    initDiagram();
  });

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

  const handleOpenWorkspace = useCallback(() => {
    setOpenDialog("workspace");
    setWorkspaceActionType("open");
  }, []);

  const handleSaveWorkspace = useCallback(() => {
    setOpenDialog("workspace");
    setWorkspaceActionType("save");
  }, []);

  const handleClearWorkspace = useCallback(async () => {
    await clearDiagram();
    setFileAccess(newFileAccess());
    setWorkspaceType(undefined);
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

  const [workspaceType, setWorkspaceType] = useState<"local" | "google">();
  const [workspaceActionType, setWorkspaceActionType] = useState<"open" | "save">();
  const [openDialog, setOpenDialog] = useState<undefined | "entrance" | "workspace">(
    noIndexedDB ? "entrance" : undefined,
  );

  const closeDialog = useCallback(() => {
    setOpenDialog(undefined);
  }, []);

  const handleFolderSelect = useCallback(async () => {
    switch (workspaceActionType) {
      case "open":
        await openDiagramFromWorkspace();
        return;
      case "save":
        await saveToWorkspace();
        return;
    }
  }, [workspaceActionType, openDiagramFromWorkspace, saveToWorkspace]);

  const resetLoadingEffect = useEffectOnce(() => {
    (async () => {
      try {
        await handleFolderSelect();
      } catch (e) {
        console.error(e);
      }
    })();
  }, true);

  const handleLocalFolderSelect = useCallback(() => {
    setFileAccess(newFileAccess());
    setWorkspaceType("local");
    setOpenDialog(undefined);
    resetLoadingEffect();
  }, [resetLoadingEffect]);

  const handleGoogleFolderSelect = useCallback(
    async (folder: GoogleDriveFolder, token: string) => {
      setFileAccess(newDriveAccess({ folderId: folder.id, token }));
      setWorkspaceType("google");
      setOpenDialog(undefined);
      resetLoadingEffect();
    },
    [resetLoadingEffect],
  );

  const handleOpenWorkspaceOnEntrance = useCallback(() => {
    setOpenDialog(undefined);
    setWorkspaceActionType("open");
    handleLocalFolderSelect();
  }, [handleLocalFolderSelect]);

  const handleGoogleFolderSelectOnEntrace = useCallback(
    (folder: GoogleDriveFolder, token: string) => {
      setOpenDialog(undefined);
      setWorkspaceActionType("open");
      handleGoogleFolderSelect(folder, token);
    },
    [handleGoogleFolderSelect],
  );

  // Use this value to recreate <AppCanvas> whenever a sheet is loaded or switched.
  // => It's safer than using the same incstance since it has complicated state.
  const sheetUniqueState = useIncrementalKeyMemo("sheet", [shapeStore]);

  // FIXME: Reduce screen blinking due to sheets transition. "bg-black" mitigates it a bit.
  return (
    <AppCanvasProvider acctx={acctx} assetAPI={assetAPI}>
      <EntranceDialog
        open={openDialog === "entrance"}
        onClose={closeDialog}
        onOpenWorkspace={handleOpenWorkspaceOnEntrance}
        onGoogleFolderSelect={handleGoogleFolderSelectOnEntrace}
        googleAvailable={googleAvailable}
      />
      <WorkspacePickerDialog
        open={openDialog === "workspace"}
        onClose={closeDialog}
        onLocalFolderSelect={handleLocalFolderSelect}
        onGoogleFolderSelect={handleGoogleFolderSelect}
        googleAvailable={googleAvailable}
      />
      <LoadingDialog open={!ready} />
      <div className="relative">
        <div className="w-screen h-screen bg-gray">
          <AppCanvas key={sheetUniqueState} />
        </div>
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
        {canPersist ? (
          <div className="fixed top-10 flex">
            <SheetList />
          </div>
        ) : undefined}
        <div className="fixed left-0 top-0 flex">
          <AppHeader
            onClickOpen={handleOpenWorkspace}
            onClickSave={handleSaveWorkspace}
            onClickClear={handleClearWorkspace}
            canSyncWorkspace={canSyncWorkspace}
            saving={saving}
            syncStatus={syncStatus}
            workspaceType={workspaceType}
          />
        </div>
      </div>
    </AppCanvasProvider>
  );
}

export default App;
