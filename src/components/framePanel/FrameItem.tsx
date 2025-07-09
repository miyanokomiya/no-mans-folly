import { useCallback, useState } from "react";
import iconDots from "../../assets/icons/three_dots_v.svg";
import iconDustbinRed from "../../assets/icons/dustbin_red.svg";
import iconLoope from "../../assets/icons/loope.svg";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { FixedPopupButton } from "../atoms/PopupButton";
import { TextInput } from "../atoms/inputs/TextInput";
import { ListButton, ListIconButton, ListSpacer } from "../atoms/buttons/ListButton";
import { ClickOrDragHandler } from "../atoms/ClickOrDragHandler";

interface Props {
  id: string;
  name: string;
  index: number;
  prime?: boolean;
  selected?: boolean;
  children?: React.ReactNode;
  onSelect?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.PointerEvent) => void;
  onNameChange?: (id: string, name: string) => void;
  onInsertBelow?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onExport?: (id: string) => void;
  onZoomIn?: (id: string, scaling?: boolean) => void;
}

export const FrameItem: React.FC<Props> = ({
  id,
  name,
  index,
  prime,
  selected,
  children,
  onSelect,
  onDragStart,
  onNameChange,
  onInsertBelow,
  onDuplicate,
  onDelete,
  onExport,
  onZoomIn,
}) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const rootClass =
    "w-full min-w-60 border rounded-xs flex flex-col relative" +
    (children ? "" : " p-1") +
    (prime ? " border-red-300 bg-red-300" : selected ? " border-yellow-300 bg-yellow-300" : "");

  const closePopup = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const handleClick = useCallback(
    (e: React.PointerEvent) => {
      onSelect?.(e);
    },
    [onSelect],
  );

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      onDragStart?.(e);
    },
    [onDragStart],
  );

  const handleRenameClick = useCallback(() => {
    setPopupOpen(false);
    setDraftName(name);
    setRenaming(true);
  }, [name]);

  const handleNameChange = useCallback((val: string) => {
    setDraftName(val);
  }, []);

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();

      if (e.detail === 2) {
        handleRenameClick();
      } else {
        onSelect?.(e);
      }
    },
    [onSelect, handleRenameClick],
  );

  const handleInsertBelow = useCallback(() => {
    onInsertBelow?.(id);
  }, [id, onInsertBelow]);

  const handleDuplicate = useCallback(() => {
    onDuplicate?.(id);
  }, [id, onDuplicate]);

  const handleDelete = useCallback(() => {
    onDelete?.(id);
  }, [id, onDelete]);

  const handleExport = useCallback(() => {
    onExport?.(id);
  }, [id, onExport]);

  const finishRename = useCallback(() => {
    onNameChange?.(id, draftName);
    setRenaming(false);
  }, [id, draftName, onNameChange]);

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

  const handleZoomIn = useCallback(() => {
    onZoomIn?.(id, true);
  }, [onZoomIn, id]);

  const handleMoveTo = useCallback(() => {
    onZoomIn?.(id);
  }, [onZoomIn, id]);

  const popupMenu = (
    <div className="w-max flex flex-col bg-white">
      <ListButton onClick={handleRenameClick}>Rename</ListButton>
      <ListSpacer />
      <ListButton onClick={handleInsertBelow}>Insert below</ListButton>
      <ListButton onClick={handleDuplicate}>Duplicate</ListButton>
      <ListSpacer />
      <ListButton onClick={handleExport}>Export</ListButton>
      <ListSpacer />
      <ListIconButton icon={iconDustbinRed} onClick={handleDelete}>
        <span className="text-red-500 font-semibold">Delete</span>
      </ListIconButton>
    </div>
  );

  const nameElm = renaming ? (
    <form className="w-full h-full flex items-center" onSubmit={handleNameSubmit}>
      <TextInput value={draftName} onChange={handleNameChange} onBlur={finishRename} autofocus keepFocus />
    </form>
  ) : (
    <div onClick={handleNameClick} className="w-full h-full px-1 flex items-center hover:bg-gray-200">
      {name}
    </div>
  );

  return (
    <div className={rootClass}>
      <div className="w-full min-h-8 flex justify-between gap-1">
        <ClickOrDragHandler
          className="flex-none min-w-8 h-8 rounded-xs px-2 bg-white border flex items-center justify-center cursor-grab"
          onClick={handleClick}
          onDragStart={handleDragStart}
        >
          {index + 1}
        </ClickOrDragHandler>
        <div className="flex-auto">{nameElm}</div>
        <div className="flex-none w-8 h-8 flex items-center justify-center">
          <OutsideObserver onClick={closePopup}>
            <FixedPopupButton
              name="frame"
              popupPosition="left"
              popup={popupMenu}
              opened={popupOpen}
              onClick={handleMenuClick}
            >
              <img src={iconDots} alt="Menu" className="w-5 h-5" />
            </FixedPopupButton>
          </OutsideObserver>
        </div>
      </div>
      {children ? (
        <div className="relative border whitespace-nowrap">
          <ClickOrDragHandler onClick={handleClick} onDragStart={handleDragStart}>
            {children}
          </ClickOrDragHandler>
          <div className="absolute right-1 bottom-1 w-8 h-8 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center rotate-45">
              <button
                type="button"
                className="border border-gray-500 bg-white hover:bg-gray-200 w-1/2 h-full rounded-l-full border-r-0"
                onClick={handleZoomIn}
                title="Zoom in"
              />
              <button
                type="button"
                className="border border-gray-500 bg-white hover:bg-gray-200 w-1/2 h-full rounded-r-full border-l-0"
                onClick={handleMoveTo}
                title="Move to"
              />
            </div>
            <img src={iconLoope} alt="Zoom in" className="w-5 h-5 absolute top-1/2 left-1/2 -translate-1/2" />
          </div>
        </div>
      ) : undefined}
    </div>
  );
};
