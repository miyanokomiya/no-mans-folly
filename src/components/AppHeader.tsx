import { useCallback, useEffect, useMemo, useState } from "react";
import { PopupButton } from "./atoms/PopupButton";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "./atoms/Dialog";
import { isCtrlOrMeta, isFileAccessAvailable } from "../utils/devices";
import { OutsideObserver } from "./atoms/OutsideObserver";
import { useGlobalKeydownEffect } from "../hooks/window";
import { GOOGLE_AUTH_RETIEVAL_URL } from "../google/utils/auth";
import { newFeatureFlags } from "../composables/featureFlags";

interface Props {
  onClickOpen: () => void;
  onClickSave: () => void;
  onClickClear: () => void;
  canSyncWorkspace: boolean;
  saving: boolean;
  syncStatus: "ok" | "autherror" | "unknownerror";
  workspaceType?: "local" | "google";
  hasTemporaryDiagram?: boolean;
}

export const AppHeader: React.FC<Props> = ({
  onClickOpen,
  onClickSave,
  onClickClear,
  canSyncWorkspace,
  saving,
  syncStatus,
  workspaceType,
  hasTemporaryDiagram,
}) => {
  const [ctrlS, setCtrlS] = useState(false);
  const [popupedKey, setPopupedKey] = useState("");

  const { googleAvailable } = newFeatureFlags();
  const fileAccessAvailable = isFileAccessAvailable();
  const noPersistence = !fileAccessAvailable && !workspaceType && !googleAvailable;

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

  const handleClickOpen = useCallback(() => {
    setPopupedKey("");
    onClickOpen();
  }, [onClickOpen]);

  const handleClickSave = useCallback(() => {
    setPopupedKey("");
    onClickSave();
  }, [onClickSave]);

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

    if (workspaceType) {
      return (
        <div className="flex flex-col w-max">
          <button type="button" className={className} onClick={handleClickClear}>
            Disconnect workspace
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col w-max">
        <button type="button" className={className} onClick={handleClickOpen}>
          Open & Sync workspace
        </button>
        <button type="button" className={className} onClick={handleClickSave}>
          Save & Sync workspace
        </button>
        {hasTemporaryDiagram ? (
          <button type="button" className={className} onClick={handleClickClear}>
            Clear diagram
          </button>
        ) : undefined}
      </div>
    );
  }, [handleClickOpen, handleClickSave, handleClickClear, workspaceType, hasTemporaryDiagram]);

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
