import { useCallback, useEffect, useMemo, useState } from "react";
import { PopupButton } from "./atoms/PopupButton";
import { Dialog, DialogButtonAlert, DialogButtonPlain } from "./atoms/Dialog";
import { isCtrlOrMeta, isFileAccessAvailable } from "../utils/devices";
import { OutsideObserver } from "./atoms/OutsideObserver";
import { useGlobalKeydownEffect } from "../hooks/window";

interface Props {
  onClickOpen: () => void;
  onClickSave: () => void;
  onClickMerge: () => void;
  onClickClear: () => void;
  canSyncLocal: boolean;
  saving: boolean;
}

export const AppHeader: React.FC<Props> = ({
  onClickOpen,
  onClickSave,
  onClickMerge,
  onClickClear,
  canSyncLocal,
  saving,
}) => {
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
    if (!canSyncLocal) {
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

    return (
      <span className="border rounded py-1 px-2 bg-lime-500 text-white">
        {saving || ctrlS ? "Synching..." : "Synched"}
      </span>
    );
  }, [canSyncLocal, onClickPopupButton, saving, ctrlS]);

  const _onClickOpen = useCallback(() => {
    setPopupedKey("");
    onClickOpen();
  }, [onClickOpen]);

  const _onClickSave = useCallback(() => {
    setPopupedKey("");
    onClickSave();
  }, [onClickSave]);

  const _onClickMerge = useCallback(() => {
    setPopupedKey("");
    onClickMerge();
  }, [onClickMerge]);

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "s" && isCtrlOrMeta(e)) {
        e.preventDefault();
        if (canSyncLocal) {
          setCtrlS(true);
        } else {
          onClickPopupButton("file");
        }
      }
    },
    [canSyncLocal, onClickPopupButton],
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
    return (
      <div className="flex flex-col w-max">
        <button type="button" className={className} onClick={_onClickOpen}>
          Open & Sync workspace
        </button>
        <button type="button" className={className} onClick={_onClickSave}>
          Save & Sync workspace
        </button>
        <button type="button" className={className} onClick={_onClickMerge}>
          Merge & Sync workspace
        </button>
        <button type="button" className={className} onClick={handleClickClear}>
          Clear diagram
        </button>
      </div>
    );
  }, [_onClickOpen, _onClickSave, _onClickMerge, handleClickClear]);

  const fileAccessAvailable = isFileAccessAvailable();

  return (
    <OutsideObserver className="h-8 bg-white flex items-center" onClick={closePopup}>
      {fileAccessAvailable ? (
        <>
          <PopupButton
            name="file"
            opened={popupedKey === "file"}
            popup={fileItems}
            onClick={onClickPopupButton}
            popupPosition="right"
          >
            <div className="px-2">File</div>
          </PopupButton>
          <div className="px-2 text-sm">
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
        </>
      ) : undefined}
    </OutsideObserver>
  );
};
