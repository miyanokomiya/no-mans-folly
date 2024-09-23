import { generateUuid } from "./utils/random";
import { AppCanvas } from "./components/AppCanvas";
import { AppToolbar } from "./components/appToolbar/AppToolbar";
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
import { FileAccess } from "./utils/fileAccess";
import { exportWorkspaceToAnother, newFileAccess } from "./composables/fileAccess";
import { LoadingDialog } from "./components/navigations/LoadingDialog";
import { WorkspacePickerDialog } from "./components/navigations/WorkspacePickerDialog";
import { useEffectOnce } from "./hooks/utils";
import { useHasShape } from "./hooks/storeHooks";
import { newFeatureFlags } from "./composables/featureFlags";
import { useUnloadWarning } from "./hooks/window";
import { useToastMessages } from "./hooks/toastMessage";
import { ToastMessages } from "./components/ToastMessages";
import { useLocalStorageAdopter } from "./hooks/localStorage";
import "./i18n";

const USER_SETTING_KEY = "userSetting";

function App() {
  const [fileAccess, setFileAccess] = useState<FileAccess>(useMemo(() => newFileAccess(), []));
  const { indexedDBMode } = newFeatureFlags();
  const canPersist = fileAccess.hasHnadle() || indexedDBMode;

  const {
    diagramStore,
    sheetStore,
    layerStore,
    shapeStore,
    documentStore,
    undoManager,
    ready,
    savePending,
    saving,
    initSheet,
    cleanCurrentSheet,
    initDiagram,
    openDiagramFromWorkspace,
    clearDiagram,
    saveToWorkspace,
    canSyncWorkspace,
    assetAPI,
    syncStatus,
    flushSaveThrottles,
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
            virtualKeyboard: touchDevice ? "modifiers" : undefined,
          },
    });
  }, []);
  useEffect(() => {
    return userSetting.watch(() => {
      localStorage.setItem(USER_SETTING_KEY, JSON.stringify(userSetting.getState()));
    });
  }, [userSetting]);

  const { toastMessages, closeToastMessage, pushToastMessage } = useToastMessages();

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

  const handleExportWorkspace = useCallback(() => {
    setOpenDialog("workspace");
    setWorkspaceActionType("export");
  }, []);

  const handleClearWorkspace = useCallback(async () => {
    await clearDiagram();
    setFileAccess(newFileAccess());
    setWorkspaceType(undefined);
  }, [clearDiagram]);

  const handleCleanSheet = useCallback(async () => {
    await cleanCurrentSheet();
  }, [cleanCurrentSheet]);

  const savePendingFlag = useMemo(() => {
    return Object.values(savePending).some((v) => v);
  }, [savePending]);

  const savingFlag = useMemo(() => {
    return Object.values(saving).some((v) => v);
  }, [saving]);

  const { state: rightPanel, setState: setRightPanel } = useLocalStorageAdopter({
    key: "right_panel",
    version: "1",
    initialValue: "",
  });
  const rightPanelWidth = 300;
  const canvasStyle = rightPanel ? { width: `calc(100% - ${rightPanelWidth}px)` } : { width: "" };
  const floatRightPanelStyle = rightPanel ? { transform: `translateX(${-rightPanelWidth}px)` } : {};
  const handleRightPanel = useCallback(
    (key: string) => {
      setRightPanel((v) => (v === key ? "" : key));
    },
    [setRightPanel],
  );

  const [workspaceType, setWorkspaceType] = useState<"local" | "google">();
  const [workspaceActionType, setWorkspaceActionType] = useState<"open" | "save" | "export">();
  const [openDialog, setOpenDialog] = useState<undefined | "entrance" | "workspace">(
    !indexedDBMode ? "entrance" : undefined,
  );

  const closeDialog = useCallback(() => {
    setOpenDialog(undefined);
  }, []);

  const [exportAccess, setExportAccess] = useState<FileAccess>();
  const [exportProgress, setExportProgress] = useState<number>();

  const handleExportWorkspaceToAnother = useCallback(async () => {
    if (!exportAccess) return;

    setExportProgress(0);
    try {
      await exportWorkspaceToAnother(fileAccess, exportAccess, setExportProgress);
    } catch (e: any) {
      alert(`Failed to export: ${e.message}`);
    } finally {
      await exportAccess.disconnect();
      setExportAccess(undefined);
      setExportProgress(undefined);
    }
  }, [fileAccess, exportAccess]);

  const handleFolderSelect = useCallback(async (): Promise<boolean> => {
    switch (workspaceActionType) {
      case "open": {
        const result = await openDiagramFromWorkspace();
        return result;
      }
      case "save":
        await saveToWorkspace();
        return true;
      case "export":
        await handleExportWorkspaceToAnother();
        return true;
      default:
        return false;
    }
  }, [workspaceActionType, openDiagramFromWorkspace, saveToWorkspace, handleExportWorkspaceToAnother]);

  const resetSelectFolderEffect = useEffectOnce(() => {
    (async () => {
      try {
        const result = await handleFolderSelect();
        if (result) {
          setOpenDialog(undefined);
        } else {
          setWorkspaceType(undefined);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, true);

  const handleLocalFolderSelect = useCallback(async () => {
    if (workspaceActionType === "export") {
      setExportAccess(newFileAccess());
    } else {
      setFileAccess(newFileAccess());
      setWorkspaceType("local");
    }

    resetSelectFolderEffect();
  }, [resetSelectFolderEffect, workspaceActionType]);

  const handleGoogleFolderSelect = useCallback(
    (folder: GoogleDriveFolder, token: string) => {
      if (workspaceActionType === "export") {
        setExportAccess(newDriveAccess({ folderId: folder.id, token }));
      } else {
        setFileAccess(newDriveAccess({ folderId: folder.id, token }));
        setWorkspaceType("google");
      }

      resetSelectFolderEffect();
    },
    [resetSelectFolderEffect, workspaceActionType],
  );

  const handleOpenWorkspaceOnEntrance = useCallback(() => {
    setWorkspaceActionType("open");
    handleLocalFolderSelect();
  }, [handleLocalFolderSelect]);

  const handleGoogleFolderSelectOnEntrace = useCallback(
    (folder: GoogleDriveFolder, token: string) => {
      setWorkspaceActionType("open");
      handleGoogleFolderSelect(folder, token);
    },
    [handleGoogleFolderSelect],
  );

  const [revoking, setRevoking] = useState(false);
  const handleRevokeExternalConnections = useCallback(async () => {
    setRevoking(true);
    setOpenDialog(undefined);
    try {
      const res = await fetch(`${process.env.API_HOST}api/auth/revoke/`, { credentials: "include" });
      if (res.status !== 200) {
        const content = await res.json();
        throw new Error(content.error);
      }
    } catch (e: any) {
      alert(`Failed to revoke connections. ${e.message}`);
    } finally {
      setRevoking(false);
      setOpenDialog("entrance");
    }
  }, []);

  const hasShape = useHasShape(shapeStore);
  const hasTemporaryDiagram = !workspaceType && hasShape;

  useUnloadWarning(!userSetting.getState().debug && (savePendingFlag || hasTemporaryDiagram));

  const loading = !ready || revoking || exportProgress !== undefined;

  // FIXME: Reduce screen blinking due to sheets transition. "bg-black" mitigates it a bit.
  return (
    <AppCanvasProvider
      acctx={acctx}
      assetAPI={assetAPI}
      toastMessages={toastMessages}
      showToastMessage={pushToastMessage}
    >
      <EntranceDialog
        open={openDialog === "entrance"}
        onClose={closeDialog}
        onOpenWorkspace={handleOpenWorkspaceOnEntrance}
        onGoogleFolderSelect={handleGoogleFolderSelectOnEntrace}
        onRevoke={handleRevokeExternalConnections}
      />
      <WorkspacePickerDialog
        open={openDialog === "workspace"}
        onClose={closeDialog}
        onLocalFolderSelect={handleLocalFolderSelect}
        onGoogleFolderSelect={handleGoogleFolderSelect}
        actionType={workspaceActionType}
        hasTemporaryDiagram={hasTemporaryDiagram}
      />
      <LoadingDialog open={loading} progress={exportProgress} />
      <div className="relative w-screen h-screen bg-gray-500 touch-none transition-all" style={canvasStyle}>
        <AppCanvas />
        <div className="absolute right-7" style={{ top: "50%", transform: "translateY(-50%)" }}>
          <AppToolbar />
        </div>
        <div className="absolute bottom-2 right-4">
          <AppFootbar />
        </div>
      </div>
      <div
        className={"fixed top-0 bottom-0 left-full bg-white transition-transform"}
        style={{ width: rightPanelWidth, ...floatRightPanelStyle }}
      >
        <AppRightPanel selected={rightPanel} onSelect={handleRightPanel} />
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
          onClickExport={handleExportWorkspace}
          onClickClear={handleClearWorkspace}
          onClickFlush={flushSaveThrottles}
          onClickCleanSheet={handleCleanSheet}
          canSyncWorkspace={canSyncWorkspace}
          savePending={savePendingFlag}
          saving={savingFlag}
          syncStatus={syncStatus}
          workspaceType={workspaceType}
          hasTemporaryDiagram={hasTemporaryDiagram}
        />
      </div>
      <ToastMessages messages={toastMessages} closeToastMessage={closeToastMessage} />
    </AppCanvasProvider>
  );
}

export default App;
