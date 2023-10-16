import { useCallback, useState } from "react";
import { Sheet } from "../../models";
import { FixedPopupButton } from "../atoms/PopupButton";
import iconDots from "../../assets/icons/three_dots_v.svg";
import { TextInput } from "../atoms/inputs/TextInput";
import { getSheetURL } from "../../utils/route";
import { OutsideObserver } from "../atoms/OutsideObserver";

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

  const rootClass = "border rounded flex flex-col p-1 bg-white relative" + (selected ? " border-sky-400" : "");

  const closePopup = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const _onClickRename = useCallback(() => {
    setPopupOpen(false);
    setDraftName(sheet.name);
    setRenaming(true);
  }, [sheet.name]);

  const _onChangeName = useCallback((val: string) => {
    setDraftName(val);
  }, []);

  const _onClickSheet = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();

      if (e.detail === 2) {
        _onClickRename();
      } else {
        onClickSheet?.(sheet.id);
      }
    },
    [sheet, onClickSheet, _onClickRename],
  );

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

  const onClickMenuButton = useCallback(() => {
    setPopupOpen(!popupOpen);
  }, [popupOpen]);

  const popupMenu = (
    <div className="flex flex-col bg-white">
      <button type="button" className="hover:bg-gray-200 p-1" onClick={_onClickRename}>
        Rename
      </button>
    </div>
  );

  const content = renaming ? (
    <form className="w-full h-full flex items-center" onSubmit={onSubmitName}>
      <TextInput value={draftName} onChange={_onChangeName} onBlur={cancelRename} autofocus keepFocus />
    </form>
  ) : (
    <a href={getSheetURL(sheet.id)} onClick={_onClickSheet} className="w-full h-full flex items-center">
      <div className="text-ellipsis overflow-hidden">{sheet.name}</div>
    </a>
  );

  return (
    <div className={rootClass}>
      <div className="flex justify-between">
        <div className="rounded px-2 bg-white border flex items-center flex-1 mr-1 cursor-grab" data-anchor>
          {index}
        </div>
        <OutsideObserver onClick={closePopup}>
          <FixedPopupButton
            name="sheet"
            popupPosition="right"
            popup={popupMenu}
            opened={popupOpen}
            onClick={onClickMenuButton}
          >
            <img src={iconDots} alt="Menu" className="w-5 h-5" />
          </FixedPopupButton>
        </OutsideObserver>
      </div>
      <div className="w-24 h-8 text-sm whitespace-nowrap">{content}</div>
    </div>
  );
};
