import { useCallback, useEffect, useRef, useState } from "react";
import iconDots from "../../assets/icons/three_dots_v.svg";
import iconDustbinRed from "../../assets/icons/dustbin_red.svg";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { FixedPopupButton } from "../atoms/PopupButton";
import { TextInput } from "../atoms/inputs/TextInput";
import { ListButton, ListIconButton } from "../atoms/buttons/ListButton";
import { FrameGroup } from "../../shapes/frameGroups/core";

interface Props {
  frameGroup: FrameGroup;
  index: number;
  children: React.ReactNode;
  selected?: boolean;
  onClick?: (id: string) => void;
  onHover?: (id: string) => void;
  onNameChange?: (id: string, name: string) => void;
  onInsertBelow?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const FrameGroupItem: React.FC<Props> = ({
  frameGroup,
  onClick,
  selected,
  index,
  children,
  onHover,
  onNameChange,
  onInsertBelow,
  onDelete,
}) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const rootClass =
    "min-w-60 border-2 rounded-xs flex flex-col p-1 bg-white relative" + (selected ? " border-sky-400" : "");

  const closePopup = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const handleRenameClick = useCallback(() => {
    setPopupOpen(false);
    setDraftName(frameGroup.name);
    setRenaming(true);
  }, [frameGroup.name]);

  const handleNameChange = useCallback((val: string) => {
    setDraftName(val);
  }, []);

  const handlePointerEnter = useCallback(() => {
    onHover?.(frameGroup.id);
  }, [frameGroup, onHover]);

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();

      if (e.detail === 2) {
        handleRenameClick();
      } else {
        onClick?.(frameGroup.id);
      }
    },
    [frameGroup, onClick, handleRenameClick],
  );

  const handleInsertBelow = useCallback(() => {
    onInsertBelow?.(frameGroup.id);
  }, [frameGroup, onInsertBelow]);

  const handleDelete = useCallback(() => {
    onDelete?.(frameGroup.id);
  }, [frameGroup, onDelete]);

  const finishRename = useCallback(() => {
    onNameChange?.(frameGroup.id, draftName);
    setRenaming(false);
  }, [frameGroup, draftName, onNameChange]);

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
    <div className="w-max flex flex-col bg-white">
      <ListButton onClick={handleRenameClick}>Rename</ListButton>
      <ListButton onClick={handleInsertBelow}>Insert below</ListButton>
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
      {frameGroup.name}
    </div>
  );

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected || !rootRef.current) return;
    rootRef.current.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" });
  }, [selected]);

  return (
    <div ref={rootRef} className={rootClass} onPointerEnter={handlePointerEnter}>
      <div className="min-h-8 flex justify-between gap-1">
        <button
          type="button"
          className="flex-none min-w-8 h-8 rounded-xs px-2 bg-white border flex items-center justify-center cursor-grab"
          data-anchor
        >
          {index + 1}
        </button>
        <div className="flex-auto">{nameElm}</div>
        <div className="flex-none w-8 h-8">
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
      <div className="mt-1 border whitespace-nowrap hover:opacity-80" data-anchor>
        {children}
      </div>
    </div>
  );
};
