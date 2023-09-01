import { useCallback } from "react";
import { PopupButton } from "../atoms/PopupButton";
import { DocAttributes } from "../../models/document";

interface AlignPanelProps {
  onClick?: (value: string) => void;
}

const AlignPanel: React.FC<AlignPanelProps> = ({ onClick }) => {
  const onClickButton = useCallback(
    (e: React.MouseEvent) => {
      const type = e.currentTarget.getAttribute("data-type")!;
      onClick?.(type);
    },
    [onClick]
  );

  return (
    <div className="flex gap-1">
      <button type="button" data-type="left" onClick={onClickButton}>
        Left
      </button>
      <button type="button" data-type="center" onClick={onClickButton}>
        Center
      </button>
      <button type="button" data-type="right" onClick={onClickButton}>
        Right
      </button>
    </div>
  );
};

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  onChanged?: (val: DocAttributes) => void;
  onBlockChanged?: (val: DocAttributes) => void;
}

export const TextItems: React.FC<Props> = ({ popupedKey, setPopupedKey, onChanged, onBlockChanged }) => {
  const onAlignClick = useCallback(() => {
    setPopupedKey("align");
  }, [setPopupedKey]);

  const onAlignChanged = useCallback(
    (value: string) => {
      console.log(value);
      onBlockChanged?.({ align: value as any });
    },
    [onBlockChanged]
  );

  return (
    <div className="flex gap-1">
      <PopupButton
        name="align"
        opened={popupedKey === "align"}
        popup={<AlignPanel onClick={onAlignChanged} />}
        onClick={onAlignClick}
      >
        <div className="w-8 h-8 border rounded-full"></div>
      </PopupButton>
    </div>
  );
};
