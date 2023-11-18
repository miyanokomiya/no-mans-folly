import { useCallback, useMemo } from "react";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { CurveType, LineType } from "../../shapes/line";
import iconLineStraight from "../../assets/icons/shape_line_straight.svg";
import iconLineElbow from "../../assets/icons/shape_line_elbow.svg";
import iconLineCurve from "../../assets/icons/shape_line_curve.svg";
import iconLineElbowCurve from "../../assets/icons/shape_line_elbow_curve.svg";

const LINE_LIST = [
  { type: "straight", icon: iconLineStraight },
  { type: "elbow", icon: iconLineElbow },
  { type: "curve", icon: iconLineCurve },
  { type: "elbow-curve", icon: iconLineElbowCurve },
] as const;
type LineItemType = (typeof LINE_LIST)[number]["type"];

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  defaultDirection?: PopupDirection; // bottom by default
  currentType: LineType;
  currentCurve?: CurveType;
  onChange?: (lineType: LineType, curveType?: CurveType) => void;
}

export const LineTypeButton: React.FC<Props> = ({
  popupedKey,
  setPopupedKey,
  defaultDirection,
  currentType,
  currentCurve,
  onChange,
}) => {
  const onLineTypeClick = useCallback(() => {
    setPopupedKey("line-type");
  }, [setPopupedKey]);

  const selected = useMemo(() => {
    if (currentType === "elbow") {
      return currentCurve === "auto" ? LINE_LIST[3] : LINE_LIST[1];
    } else {
      return currentCurve === "auto" ? LINE_LIST[2] : LINE_LIST[0];
    }
  }, [currentType, currentCurve]);

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="line-type"
        opened={popupedKey === "line-type"}
        popup={<LineTypePanel itemType={selected.type} onClick={onChange} />}
        onClick={onLineTypeClick}
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
  onClick?: (lineType: LineType, curveType?: CurveType) => void;
}

const LineTypePanel: React.FC<LineTypePanelProps> = ({ itemType: currentType, onClick }) => {
  const onDownLineElm = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const value = e.currentTarget.getAttribute("data-type")! as LineItemType;
      switch (value) {
        case "straight":
          onClick?.(undefined);
          return;
        case "elbow":
          onClick?.("elbow");
          return;
        case "curve":
          onClick?.(undefined, "auto");
          return;
        case "elbow-curve":
          onClick?.("elbow", "auto");
          return;
      }
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
