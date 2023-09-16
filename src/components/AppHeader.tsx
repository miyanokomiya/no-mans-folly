import { useCallback, useMemo, useState } from "react";
import { PopupButton } from "./atoms/PopupButton";
import { useOutsideClickCallback } from "../composables/window";

interface Props {
  onClickOpen: () => void;
  onClickSave: () => void;
  canSyncoLocal: boolean;
  autoSaved: number;
}

export const AppHeader: React.FC<Props> = ({ onClickOpen, onClickSave, canSyncoLocal, autoSaved }) => {
  const [popupedKey, setPopupedKey] = useState("");
  const onClickPopupButton = useCallback(
    (name: string) => {
      if (popupedKey === name) {
        setPopupedKey("");
      } else {
        setPopupedKey(name);
      }
    },
    [popupedKey]
  );

  const closePopup = useCallback(() => {
    setPopupedKey("");
  }, []);
  const { ref } = useOutsideClickCallback<HTMLDivElement>(closePopup);

  const storageMessage = useMemo(() => {
    if (!canSyncoLocal) {
      return (
        <button type="button" onClick={() => onClickPopupButton("file")}>
          Open/Save workspace for persistence
        </button>
      );
    }

    const lastSaved = autoSaved === 0 ? "-" : new Date(autoSaved).toLocaleString();
    return <span>Sync local. Last saved: {lastSaved}</span>;
  }, [autoSaved, canSyncoLocal, onClickPopupButton]);

  const _onClickOpen = useCallback(() => {
    setPopupedKey("");
    onClickOpen();
  }, [onClickOpen]);

  const _onClickSave = useCallback(() => {
    setPopupedKey("");
    onClickSave();
  }, [onClickSave]);

  const fileItems = useMemo(() => {
    return (
      <div className="flex flex-col w-max">
        <button type="button" className="py-1 px-2 border" onClick={_onClickOpen}>
          Open workspace
        </button>
        <button type="button" className="py-1 px-2 border" onClick={_onClickSave}>
          Save workspace
        </button>
      </div>
    );
  }, [onClickOpen, onClickSave]);

  return (
    <div ref={ref} className="h-8 bg-white flex items-center">
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
    </div>
  );
};
