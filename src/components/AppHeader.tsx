import { useCallback, useEffect, useMemo, useState } from "react";
import { PopupButton } from "./atoms/PopupButton";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "./atoms/Dialog";
import { isCtrlOrMeta } from "../utils/devices";
import { OutsideObserver } from "./atoms/OutsideObserver";
import { useGlobalKeydownEffect } from "../hooks/window";
import { GOOGLE_AUTH_RETIEVAL_URL } from "../google/utils/auth";

interface Props {
  onClickOpen: () => void;
  onClickSave: () => void;
  onClickExport: () => void;
  onClickClear: () => void;
  onClickFlush: () => void;
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
    const baseClass = "border rounded py-1 px-2 text-white select-none ";

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
      return <span className={baseClass + "bg-lime-500"}>Saving...</span>;
    }

    if (savePending) {
      return (
        <button type="button" className={baseClass + "bg-lime-500"} onClick={onClickFlush}>
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

  const fileItems = useMemo(() => {
    const className = "p-2 border hover:bg-gray-200 text-left";

    if (workspaceType) {
      return (
        <div className="flex flex-col w-max">
          <button type="button" className={className} onClick={handleClickExport}>
            Export workspace
          </button>
          <button type="button" className={className} onClick={handleClickClear}>
            Disconnect workspace
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col w-max">
        <button type="button" className={className} onClick={handleClickOpen}>
          Open workspace
        </button>
        <button type="button" className={className} onClick={handleClickSave}>
          Save & Open workspace
        </button>
        {hasTemporaryDiagram ? (
          <button type="button" className={className} onClick={handleClickClear}>
            Clear diagram
          </button>
        ) : undefined}
      </div>
    );
  }, [handleClickOpen, handleClickSave, handleClickExport, handleClickClear, workspaceType, hasTemporaryDiagram]);

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
      <div className="ml-2 text-sm">
        <span>{storageMessage}</span>
      </div>
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
    </OutsideObserver>
  );
};
