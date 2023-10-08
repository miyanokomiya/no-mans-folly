import { useCallback, useMemo, useState } from "react";
import { Sheet } from "../../models";
import { FixedPopupButton } from "../atoms/PopupButton";
import { useOutsideClickCallback } from "../../composables/window";
import iconDots from "../../assets/icons/three_dots_v.svg";
import { TextInput } from "../atoms/inputs/TextInput";
import { getSheetURL } from "../../utils/route";

interface Props {
  sheet: Sheet;
  onClickSheet?: (id: string) => void;
  selected?: boolean;
  index: number;
  onChangeName?: (id: string, name: string) => void;
}

export const SheetPanel: React.FC<Props> = ({ sheet, onClickSheet, selected, index, onChangeName }) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const _onClickSheet = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();
      onClickSheet?.(sheet.id);
    },
    [onClickSheet],
  );

  const rootClass = "border rounded flex flex-col p-1 bg-white relative" + (selected ? " border-sky-400" : "");

  const closePopup = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const { ref } = useOutsideClickCallback<HTMLDivElement>(closePopup);

  const _onClickRename = useCallback(() => {
    setPopupOpen(false);
    setDraftName(sheet.name);
    setRenaming(true);
  }, [sheet]);

  const _onChangeName = useCallback((val: string) => {
    setDraftName(val);
  }, []);

  const onSubmitName = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onChangeName?.(sheet.id, draftName);
      setRenaming(false);
    },
    [sheet, draftName],
  );

  const cancelRename = useCallback(() => {
    setRenaming(false);
  }, []);

  const popupMenu = useMemo(() => {
    return (
      <div className="flex flex-col bg-white">
        <button type="button" className="hover:bg-gray-200 p-1" onClick={_onClickRename}>
          Rename
        </button>
      </div>
    );
  }, []);

  const content = useMemo(() => {
    if (renaming) {
      return (
        <form className="w-full h-full flex items-center" onSubmit={onSubmitName}>
          <TextInput value={draftName} onChange={_onChangeName} onBlur={cancelRename} autofocus keepFocus />
        </form>
      );
    } else {
      return (
        <a href={getSheetURL(sheet.id)} onClick={_onClickSheet} className="w-full h-full flex items-center" data-anchor>
          <div className="text-ellipsis overflow-hidden">{sheet.name}</div>
        </a>
      );
    }
  }, [renaming, draftName]);

  const onClickMenuButton = useCallback(() => {
    setPopupOpen(!popupOpen);
  }, [popupOpen]);

  return (
    <div className={rootClass}>
      <div className="flex justify-between">
        <div className="rounded-full h-5 px-1 bg-white border text-sm flex items-center justify-center pointer-events-none">
          {index}
        </div>
        <div ref={ref} className="">
          <FixedPopupButton
            name="sheet"
            popupPosition="right"
            popup={popupMenu}
            opened={popupOpen}
            onClick={onClickMenuButton}
          >
            <img src={iconDots} alt="Menu" className="w-4 h-4" />
          </FixedPopupButton>
        </div>
      </div>
      <div className="w-24 h-8 text-sm whitespace-nowrap">{content}</div>
    </div>
  );
};
