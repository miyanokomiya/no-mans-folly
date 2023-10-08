import { useCallback, useMemo } from "react";
import { PopupButton } from "../atoms/PopupButton";
import { LineType } from "../../shapes/line";
import iconLineStraight from "../../assets/icons/shape_line_straight.svg";
import iconLineElbow from "../../assets/icons/shape_line_elbow.svg";

const LINE_LIST = [
  { type: "straight", icon: iconLineStraight },
  { type: "elbow", icon: iconLineElbow },
];

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  currentType: LineType;
  onChange?: (lineType: LineType) => void;
}

export const LineTypeButton: React.FC<Props> = ({ popupedKey, setPopupedKey, currentType, onChange }) => {
  const onLineTypeClick = useCallback(() => {
    setPopupedKey("line-type");
  }, [setPopupedKey]);

  const selected = useMemo(() => {
    return LINE_LIST.find((item) => item.type === currentType) ?? LINE_LIST[0];
  }, [currentType]);

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="line-type"
        opened={popupedKey === "line-type"}
        popup={<LineTypePanel currentType={currentType} onClick={onChange} />}
        onClick={onLineTypeClick}
      >
        <div className="w-8 h-8 p-1">
          <img src={selected.icon} alt={selected.type} />
        </div>
      </PopupButton>
    </div>
  );
};

interface LineTypePanelProps {
  currentType: LineType;
  onClick?: (lineType: LineType) => void;
}

const LineTypePanel: React.FC<LineTypePanelProps> = ({ currentType, onClick }) => {
  const onDownLineElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const type = e.currentTarget.getAttribute("data-type")!;
      onClick?.(type as LineType);
    },
    [onClick],
  );

  const lines = LINE_LIST.map((item) => (
    <button
      key={item.type}
      type="button"
      className={"w-10 h-10 border p-1 rounded" + (currentType === item.type ? " border-2 border-cyan-400" : "")}
      data-type={item.type}
      onMouseDown={onDownLineElm}
    >
      <img src={item.icon} alt={item.type} />
    </button>
  ));

  return <div className="flex gap-1">{lines}</div>;
};
