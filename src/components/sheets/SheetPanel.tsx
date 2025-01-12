import { useCallback, useState } from "react";
import { Sheet } from "../../models";
import { FixedPopupButton } from "../atoms/PopupButton";
import iconDots from "../../assets/icons/three_dots_v.svg";
import { TextInput } from "../atoms/inputs/TextInput";
import { getSheetURL } from "../../utils/route";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { ListButton } from "../atoms/buttons/ListButton";

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

  const handleRenameClick = useCallback(() => {
    setPopupOpen(false);
    setDraftName(sheet.name);
    setRenaming(true);
  }, [sheet.name]);

  const handleNameChange = useCallback((val: string) => {
    setDraftName(val);
  }, []);

  const handleSheetClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();

      if (e.detail === 2) {
        handleRenameClick();
      } else {
        onClickSheet?.(sheet.id);
      }
    },
    [sheet, onClickSheet, handleRenameClick],
  );

  const finishRename = useCallback(() => {
    onChangeName?.(sheet.id, draftName);
    setRenaming(false);
  }, [sheet, draftName, onChangeName]);

  const handleNameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      finishRename();
    },
    [finishRename],
  );

  const handleMenuClick = useCallback(() => {
    setPopupOpen(!popupOpen);
  }, [popupOpen]);

  const popupMenu = (
    <div className="flex flex-col bg-white">
      <ListButton onClick={handleRenameClick}>Rename</ListButton>
    </div>
  );

  const content = renaming ? (
    <form className="w-full h-full flex items-center" onSubmit={handleNameSubmit}>
      <TextInput value={draftName} onChange={handleNameChange} onBlur={finishRename} autofocus keepFocus />
    </form>
  ) : (
    <a href={getSheetURL(sheet.id)} onClick={handleSheetClick} className="w-full h-full flex items-center">
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
            onClick={handleMenuClick}
          >
            <img src={iconDots} alt="Menu" className="w-5 h-5" />
          </FixedPopupButton>
        </OutsideObserver>
      </div>
      <div className="w-24 h-6 text-sm whitespace-nowrap">{content}</div>
    </div>
  );
};
