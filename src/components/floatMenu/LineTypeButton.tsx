import { useCallback, useMemo } from "react";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { CurveType, LineType } from "../../shapes/line";
import iconLineStraight from "../../assets/icons/shape_line_straight.svg";
import iconLineElbow from "../../assets/icons/shape_line_elbow.svg";
import iconLineCurve from "../../assets/icons/shape_line_curve.svg";
import iconLineElbowCurve from "../../assets/icons/shape_line_elbow_curve.svg";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { AppText } from "../molecules/AppText";
import { IconButton } from "../atoms/buttons/IconButton";

const LINE_LIST = [
  { type: "straight", icon: iconLineStraight },
  { type: "curve", icon: iconLineCurve },
  { type: "elbow", icon: iconLineElbow },
  { type: "elbow-curve", icon: iconLineElbowCurve },
] as const;
type LineItemType = (typeof LINE_LIST)[number]["type"];

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  defaultDirection?: PopupDirection;
  currentType: LineType;
  currentCurve?: CurveType;
  onChange?: (lineType: LineType, curveType?: CurveType) => void;
  jump?: boolean;
  onJumpChange?: (val: boolean) => void;
}

export const LineTypeButton: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  defaultDirection,
  currentType,
  currentCurve,
  onChange,
  jump,
  onJumpChange,
}) => {
  const selected = useMemo(() => {
    let type: LineItemType;
    if (currentType === "elbow") {
      type = currentCurve === "auto" ? "elbow-curve" : "elbow";
    } else {
      type = currentCurve === "auto" ? "curve" : "straight";
    }
    return LINE_LIST.find((v) => v.type === type)!;
  }, [currentType, currentCurve]);

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="line-type"
        opened={popupedKey === "line-type"}
        popup={
          <LineTypePanel itemType={selected.type} onTypeClick={onChange} jump={jump} onJumpChange={onJumpChange} />
        }
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={selected.icon} alt={selected.type} />
        </div>
      </PopupButton>
    </div>
  );
};

interface LineTypePanelProps {
  itemType: LineItemType;
  onTypeClick?: (lineType: LineType, curveType?: CurveType) => void;
  jump?: boolean;
  onJumpChange?: (val: boolean) => void;
}

const LineTypePanel: React.FC<LineTypePanelProps> = ({ itemType, onTypeClick, jump, onJumpChange }) => {
  const handleTypeClick = useCallback(
    (value: string) => {
      switch (value) {
        case "straight":
          onTypeClick?.(undefined);
          return;
        case "elbow":
          onTypeClick?.("elbow");
          return;
        case "curve":
          onTypeClick?.(undefined, "auto");
          return;
        case "elbow-curve":
          onTypeClick?.("elbow", "auto");
          return;
      }
    },
    [onTypeClick],
  );

  const lines = LINE_LIST.map((item) => (
    <IconButton
      key={item.type}
      value={item.type}
      icon={item.icon}
      size={10}
      highlight={itemType === item.type}
      onClick={handleTypeClick}
    />
  ));

  return (
    <div className="p-2 flex flex-col gap-1">
      <div className="flex gap-1">{lines}</div>
      <div className="flex justify-end">
        <ToggleInput value={jump} onChange={onJumpChange}>
          <AppText portal={true}>[[LINE_JUMP]]</AppText>
        </ToggleInput>
      </div>
    </div>
  );
};
