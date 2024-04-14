import { useCallback, useEffect, useMemo, useState } from "react";
import { PopupButton } from "./atoms/PopupButton";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "./atoms/Dialog";
import { isCtrlOrMeta } from "../utils/devices";
import { OutsideObserver } from "./atoms/OutsideObserver";
import { useGlobalKeydownEffect } from "../hooks/window";
import { GOOGLE_AUTH_RETIEVAL_URL } from "../google/utils/auth";
import { CleanSheetDialog } from "./navigations/CleanSheetDialog";
import { ListButton, ListSpacer } from "./atoms/buttons/ListButton";

interface Props {
  onClickOpen: () => void;
  onClickSave: () => void;
  onClickExport: () => void;
  onClickClear: () => void;
  onClickFlush: () => void;
  onClickCleanSheet: () => void;
  canSyncWorkspace: boolean;
  savePending: boolean;
  saving: boolean;
  syncStatus: "ok" | "autherror" | "unknownerror";
  workspaceType?: "local" | "google";
  hasTemporaryDiagram?: boolean;
}

export const AppHeader: React.FC<Props> = ({
  onClickOpen,
  onClickSave,
  onClickExport,
  onClickClear,
  onClickFlush,
  onClickCleanSheet,
  canSyncWorkspace,
  savePending,
  saving,
  syncStatus,
  workspaceType,
  hasTemporaryDiagram,
}) => {
  // Used for pretending to save
  const [ctrlS, setCtrlS] = useState(false);
  const [popupedKey, setPopupedKey] = useState("");

  const onClickPopupButton = useCallback(
    (name: string) => {
      if (popupedKey === name) {
        setPopupedKey("");
      } else {
        setPopupedKey(name);
      }
    },
    [popupedKey],
  );

  const closePopup = useCallback(() => {
    setPopupedKey("");
  }, []);
  const storageMessage = useMemo(() => {
    const baseClass = "rounded h-7 px-2 flex items-center text-white select-none ";

    if (!canSyncWorkspace) {
      return (
        <button className={baseClass + "bg-red-500"} type="button" onClick={() => onClickPopupButton("file")}>
          No workspace
        </button>
      );
    }

    if (syncStatus === "unknownerror") {
      return <span className={baseClass + "bg-red-500"}>Failed to sync</span>;
    }

    if (workspaceType === "google" && syncStatus === "autherror") {
      return (
        <a className={baseClass + "bg-orange-500"} href={GOOGLE_AUTH_RETIEVAL_URL} target="_blank" rel="noreferrer">
          Auth expired. Click here to open sign in page. Data will be synced on next update after auth recovered.
        </a>
      );
    }

    if (saving || ctrlS) {
      return <span className={baseClass + "bg-yellow-500"}>Saving...</span>;
    }

    if (savePending) {
      return (
        <button type="button" className={baseClass + "bg-yellow-500"} onClick={onClickFlush}>
          Pending...
        </button>
      );
    }

    return <span className={baseClass + "bg-lime-500"}>Synched</span>;
  }, [canSyncWorkspace, onClickPopupButton, savePending, saving, ctrlS, syncStatus, workspaceType, onClickFlush]);

  const handleClickOpen = useCallback(() => {
    setPopupedKey("");
    onClickOpen();
  }, [onClickOpen]);

  const handleClickSave = useCallback(() => {
    setPopupedKey("");
    onClickSave();
  }, [onClickSave]);

  const handleClickExport = useCallback(() => {
    setPopupedKey("");
    onClickExport();
  }, [onClickExport]);

  const [openClearConfirm, setOpenClearConfirm] = useState(false);
  const closeClearConfirm = useCallback(() => {
    setOpenClearConfirm(false);
  }, []);

  const handleClickClear = useCallback(() => {
    setPopupedKey("");
    setOpenClearConfirm(true);
  }, []);

  const [openCleanConfirm, setOpenCleanConfirm] = useState(false);
  const closeCleanConfirm = useCallback(() => {
    setOpenCleanConfirm(false);
  }, []);

  const handleClickCleanSheet = useCallback(() => {
    setPopupedKey("");
    setOpenCleanConfirm(true);
  }, []);

  const handleProcCleanSheet = useCallback(() => {
    setOpenCleanConfirm(false);
    onClickCleanSheet();
  }, [onClickCleanSheet]);

  const clearDiagram = useCallback(() => {
    setOpenClearConfirm(false);
    onClickClear();
  }, [onClickClear]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "s" && isCtrlOrMeta(e)) {
        e.preventDefault();

        if (savePending) {
          onClickFlush?.();
        } else if (canSyncWorkspace && syncStatus === "ok") {
          setCtrlS(true);
        } else {
          onClickPopupButton("file");
        }
      }
    },
    [canSyncWorkspace, onClickPopupButton, onClickFlush, savePending, syncStatus],
  );
  useGlobalKeydownEffect(handleKeyDown);

  useEffect(() => {
    if (!ctrlS) return;

    const timer = setTimeout(() => {
      setCtrlS(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [ctrlS]);

  const isWorkspaceStable = !saving && !savePending;

  const fileItems = useMemo(() => {
    if (workspaceType) {
      return (
        <div className="flex flex-col w-max">
          <ListButton disabled={!isWorkspaceStable} onClick={handleClickExport}>
            Export workspace
          </ListButton>
          <ListButton disabled={!isWorkspaceStable} onClick={handleClickClear}>
            Disconnect workspace
          </ListButton>
          <ListSpacer />
          <ListButton disabled={!isWorkspaceStable} onClick={handleClickCleanSheet}>
            Clean sheet
          </ListButton>
        </div>
      );
    }

    return (
      <div className="flex flex-col w-max">
        <ListButton onClick={handleClickOpen}>Open workspace</ListButton>
        <ListButton onClick={handleClickSave}>Save & Open workspace</ListButton>
        {hasTemporaryDiagram ? (
          <>
            <ListSpacer />
            <ListButton onClick={handleClickClear}>Clear diagram</ListButton>
          </>
        ) : undefined}
      </div>
    );
  }, [
    handleClickOpen,
    handleClickSave,
    handleClickExport,
    handleClickClear,
    handleClickCleanSheet,
    workspaceType,
    hasTemporaryDiagram,
    isWorkspaceStable,
  ]);

  return (
    <OutsideObserver className="h-10 px-1 bg-white rounded-b flex items-center" onClick={closePopup}>
      <PopupButton
        name="file"
        opened={popupedKey === "file"}
        popup={fileItems}
        onClick={onClickPopupButton}
        popupPosition="right"
      >
        <div className="px-2">File</div>
      </PopupButton>
      <div className="ml-2 text-sm">{storageMessage}</div>
      <Dialog
        open={openClearConfirm}
        onClose={closeClearConfirm}
        title={workspaceType ? "Disconnect workspace" : "Clear diagram"}
        actions={
          <>
            <DialogButtonPlain onClick={closeClearConfirm}>Cancel</DialogButtonPlain>
            <DialogButtonAlert onClick={clearDiagram}>Clear</DialogButtonAlert>
          </>
        }
      >
        {workspaceType ? (
          <div>
            <p>This action closes this diagram.</p>
            <p>Workspace files will not be affected by this action.</p>
          </div>
        ) : (
          <div>
            <p>This diagram is yet to be saved to any workspace.</p>
            <p>This action will clear this diagram and it cannot be undone.</p>
          </div>
        )}
      </Dialog>
      <CleanSheetDialog open={openCleanConfirm} onClickOK={handleProcCleanSheet} onClose={closeCleanConfirm} />
    </OutsideObserver>
  );
};
