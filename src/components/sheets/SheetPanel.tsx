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
import { renderImageAtCenter } from "../../utils/renderer";
import { AppText } from "../molecules/AppText";

interface Props {
  sheet: Sheet;
  selected?: boolean;
  index: number;
  canDeleteSheet?: boolean;
  thumbnail?: HTMLImageElement;
  awarenessCount?: number;
  onClickSheet?: (id: string) => void;
  onChangeName?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onAddSheetImage?: (id: string) => void;
}

export const SheetPanel: React.FC<Props> = ({
  sheet,
  onClickSheet,
  selected,
  index,
  thumbnail,
  awarenessCount,
  onChangeName,
  onDelete,
  onAddSheetImage,
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

  const handleAddSheetImage = useCallback(() => {
    setPopupOpen(false);
    onAddSheetImage?.(sheet.id);
  }, [sheet.id, onAddSheetImage]);

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
      <ListButton onClick={handleAddSheetImage}>
        <AppText portal> [[SHEET_TO_SHAPE]]</AppText>
      </ListButton>
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
    renderImageAtCenter(ctx, thumbnail, { width: canvasElm.width, height: canvasElm.height });
  }, [thumbnail, sheet]);

  const nameContent = renaming ? (
    <form className="flex items-center" onSubmit={handleNameSubmit}>
      <TextInput value={draftName} onChange={handleNameChange} onBlur={finishRename} autofocus keepFocus />
    </form>
  ) : (
    <a className="hover:bg-gray-200" href={getSheetURL(sheet.id)} onClick={handleSheetClick}>
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
      <div className="relative w-full h-20 border flex items-center justify-center" data-anchor>
        {thumbnail ? (
          <canvas ref={canvasRef} width="144" height="78" />
        ) : (
          <div className="select-none touch-none">No thumbnail</div>
        )}
        {awarenessCount ? (
          <div className="absolute left-0 bottom-0 px-1.5 rounded-lg bg-green-300 text-sm flex items-center justify-center">
            {awarenessCount}
          </div>
        ) : undefined}
      </div>
    </div>
  );
};
