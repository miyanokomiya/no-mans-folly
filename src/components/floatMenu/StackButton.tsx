import { useCallback } from "react";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import iconStack from "../../assets/icons/stack.svg";
import iconStackFirst from "../../assets/icons/stack_first.svg";
import iconStackLast from "../../assets/icons/stack_last.svg";

interface Props {
  popupKey: string;
  setPopupKey: (key: string) => void;
  defaultDirection?: PopupDirection; // bottom by default
  onClickFirst?: () => void;
  onClickBack?: () => void;
  onClickFront?: () => void;
  onClickLast?: () => void;
}

export const StackButton: React.FC<Props> = ({
  popupKey,
  setPopupKey,
  defaultDirection,
  onClickFirst,
  onClickLast,
}) => {
  const onStackClick = useCallback(() => {
    setPopupKey("stack");
  }, [setPopupKey]);

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="stack"
        opened={popupKey === "stack"}
        popup={<StackPanel onClickFirst={onClickFirst} onClickLast={onClickLast} />}
        onClick={onStackClick}
        defaultDirection={defaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={iconStack} alt="Stack" />
        </div>
      </PopupButton>
    </div>
  );
};

interface StackPanelProps {
  onClickFirst?: () => void;
  onClickBack?: () => void;
  onClickFront?: () => void;
  onClickLast?: () => void;
}

const StackPanel: React.FC<StackPanelProps> = ({ onClickFirst, onClickLast }) => {
  return (
    <div className="flex gap-1">
      <button type="button" className="w-10 h-10 p-1 rounded-xs border" onClick={onClickFirst}>
        <img src={iconStackFirst} alt="To the first" />
      </button>
      <button type="button" className="w-10 h-10 p-1 rounded-xs border" onClick={onClickLast}>
        <img src={iconStackLast} alt="To the last" />
      </button>
    </div>
  );
};
