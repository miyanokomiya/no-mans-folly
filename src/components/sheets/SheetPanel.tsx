import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet } from "../../models";
import { FixedPopupButton } from "../atoms/PopupButton";
import iconDots from "../../assets/icons/three_dots_v.svg";
import iconDustbinRed from "../../assets/icons/dustbin_red.svg";
import { TextInput } from "../atoms/inputs/TextInput";
import { getSheetURL } from "../../utils/route";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { ListButton, ListIconButton, ListSpacer } from "../atoms/buttons/ListButton";
import { rednerRGBA } from "../../utils/color";

interface Props {
  sheet: Sheet;
  selected?: boolean;
  index: number;
  canDeleteSheet?: boolean;
  thumbnail?: HTMLImageElement;
  onClickSheet?: (id: string) => void;
  onChangeName?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

export const SheetPanel: React.FC<Props> = ({
  sheet,
  onClickSheet,
  selected,
  index,
  thumbnail,
  onChangeName,
  onDelete,
  canDeleteSheet,
}) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const rootClass = "border rounded-xs flex flex-col p-1 bg-white relative" + (selected ? " border-sky-400" : "");

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

  const handleDeleteClick = useCallback(() => {
    setPopupOpen(false);
    onDelete?.(sheet.id);
  }, [sheet.id, onDelete]);

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
      <ListSpacer />
      <ListIconButton icon={iconDustbinRed} onClick={handleDeleteClick} disabled={!canDeleteSheet}>
        <span className="text-red-500 font-semibold">Delete</span>
      </ListIconButton>
    </div>
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvasElm = canvasRef.current;
    if (!canvasElm || !thumbnail) return;

    const ctx = canvasElm.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasElm.width, canvasElm.height);
    ctx.fillStyle = sheet.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff";
    ctx.fillRect(0, 0, canvasElm.width, canvasElm.height);
    const [scaleW, scaleH] = [canvasElm.width / thumbnail.width, canvasElm.height / thumbnail.height];
    const scale = Math.min(scaleW, scaleH);
    const scaledWidth = thumbnail.width * scale;
    const scaledHeight = thumbnail.height * scale;
    const dx = (canvasElm.width - scaledWidth) / 2;
    const dy = (canvasElm.height - scaledHeight) / 2;
    ctx.drawImage(thumbnail, 0, 0, thumbnail.width, thumbnail.height, dx, dy, scaledWidth, scaledHeight);
  }, [thumbnail, sheet]);

  const nameContent = renaming ? (
    <form className="flex items-center" onSubmit={handleNameSubmit}>
      <TextInput value={draftName} onChange={handleNameChange} onBlur={finishRename} autofocus keepFocus />
    </form>
  ) : (
    <a href={getSheetURL(sheet.id)} onClick={handleSheetClick}>
      {index}. {sheet.name}
    </a>
  );

  return (
    <div className={rootClass}>
      <div className="flex items-center justify-between gap-1">
        <div className="w-28 truncate text-sm">{nameContent}</div>
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
      <div className="w-full h-20 border cursor-grab flex items-center justify-center" data-anchor>
        {thumbnail ? <canvas ref={canvasRef} width="144" height="78" /> : <div>No thumbnail</div>}
      </div>
    </div>
  );
};
