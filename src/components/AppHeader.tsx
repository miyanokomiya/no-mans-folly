import { useCallback, useEffect, useMemo, useState } from "react";
import { PopupButton } from "./atoms/PopupButton";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "./atoms/Dialog";
import { isCtrlOrMeta, isFileAccessAvailable } from "../utils/devices";
import { OutsideObserver } from "./atoms/OutsideObserver";
import { useGlobalKeydownEffect } from "../hooks/window";
import { GOOGLE_AUTH_RETIEVAL_URL } from "../google/utils/auth";

interface Props {
  onClickOpen: () => void;
  onClickSave: () => void;
  onClickClear: () => void;
  canSyncWorkspace: boolean;
  saving: boolean;
  syncStatus: "ok" | "autherror" | "unknownerror";
  workspaceType: "local" | "google";
}

export const AppHeader: React.FC<Props> = ({
  onClickOpen,
  onClickSave,
  onClickClear,
  canSyncWorkspace,
  saving,
  syncStatus,
  workspaceType,
}) => {
  const [ctrlS, setCtrlS] = useState(false);
  const [popupedKey, setPopupedKey] = useState("");

  const fileAccessAvailable = isFileAccessAvailable();
  const noPersistence = !fileAccessAvailable && workspaceType === "local";

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
    if (!canSyncWorkspace) {
      return (
        <button
          className="border rounded py-1 px-2 bg-red-500 text-white"
          type="button"
          onClick={() => onClickPopupButton("file")}
        >
          Sync workspace for persistence
        </button>
      );
    }

    if (syncStatus === "unknownerror") {
      return <span className="border rounded py-1 px-2 bg-red-500 text-white">Failed to sync</span>;
    }

    if (workspaceType === "google" && syncStatus === "autherror") {
      return (
        <a
          className="border rounded py-1 px-2 bg-orange-500 text-white"
          href={GOOGLE_AUTH_RETIEVAL_URL}
          target="_blank"
          rel="noreferrer"
        >
          Auth expired. Click here to open sign in page. Data will be synced on next update after auth recovered.
        </a>
      );
    }

    return (
      <span className="border rounded py-1 px-2 bg-lime-500 text-white">
        {saving || ctrlS ? "Pending..." : "Synched"}
      </span>
    );
  }, [canSyncWorkspace, onClickPopupButton, saving, ctrlS, syncStatus, workspaceType]);

  const _onClickOpen = useCallback(() => {
    setPopupedKey("");
    onClickOpen();
  }, [onClickOpen]);

  const _onClickSave = useCallback(() => {
    setPopupedKey("");
    onClickSave();
  }, [onClickSave]);

  const [openClearConfirm, setOpenClearConfirm] = useState(false);
  const closeClearConfirm = useCallback(() => {
    setOpenClearConfirm(false);
  }, []);

  const handleClickClear = useCallback(() => {
    setOpenClearConfirm(true);
  }, []);

  const clearDiagram = useCallback(() => {
    setPopupedKey("");
    setOpenClearConfirm(false);
    onClickClear();
  }, [onClickClear]);

  const disconnectWorkspace = useCallback(() => {
    // TODO: Polish this process
    location.reload();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "s" && isCtrlOrMeta(e)) {
        e.preventDefault();
        if (canSyncWorkspace) {
          setCtrlS(true);
        } else {
          onClickPopupButton("file");
        }
      }
    },
    [canSyncWorkspace, onClickPopupButton],
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
    const className = "p-2 border hover:bg-gray-200";

    if (workspaceType === "google") {
      return (
        <div className="flex flex-col w-max">
          <button type="button" className={className} onClick={disconnectWorkspace}>
            Disconnect workspace
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col w-max">
        <button type="button" className={className} onClick={_onClickOpen}>
          Open & Sync workspace
        </button>
        <button type="button" className={className} onClick={_onClickSave}>
          Save & Sync workspace
        </button>
        <button type="button" className={className} onClick={handleClickClear}>
          Clear diagram
        </button>
      </div>
    );
  }, [_onClickOpen, _onClickSave, handleClickClear, disconnectWorkspace, workspaceType]);

  if (noPersistence) {
    return <></>;
  }

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
        title="Clear diagram"
        actions={
          <>
            <DialogButtonPlain onClick={closeClearConfirm}>Cancel</DialogButtonPlain>
            <DialogButtonAlert onClick={clearDiagram}>Clear</DialogButtonAlert>
          </>
        }
      >
        <div>
          <p>All data stored in IndexedDB will be cleared.</p>
          <p>Workspace files will not be affected.</p>
          <p>This action cannot be undone.</p>
        </div>
      </Dialog>
    </OutsideObserver>
  );
};
