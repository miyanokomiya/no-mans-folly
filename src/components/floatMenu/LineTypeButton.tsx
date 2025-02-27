import { useCallback, useMemo } from "react";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { CurveType, LineType } from "../../shapes/line";
import iconLineStraight from "../../assets/icons/shape_line_straight.svg";
import iconLineElbow from "../../assets/icons/shape_line_elbow.svg";
import iconLineCurve from "../../assets/icons/shape_line_curve.svg";
import iconLineElbowCurve from "../../assets/icons/shape_line_elbow_curve.svg";
import iconLineShape from "../../assets/icons/line_shape.svg";
import iconLinePolyline from "../../assets/icons/line_polyline.svg";
import iconLinePolygon from "../../assets/icons/line_polygon.svg";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { AppText } from "../molecules/AppText";
import { InlineField } from "../atoms/InlineField";
import { RadioSelectInput } from "../atoms/inputs/RadioSelectInput";

const LINE_LIST = [
  { type: "straight", icon: iconLineStraight },
  { type: "curve", icon: iconLineCurve },
  { type: "elbow", icon: iconLineElbow },
  { type: "elbow-curve", icon: iconLineElbowCurve },
] as const;
type LineItemType = (typeof LINE_LIST)[number]["type"];

const POLYGON_TYPE_LIST = [
  { type: "line", icon: iconLineShape },
  { type: "polyline", icon: iconLinePolyline },
  { type: "polygon", icon: iconLinePolygon },
] as const;
type PolygonType = (typeof POLYGON_TYPE_LIST)[number]["type"];

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  defaultDirection?: PopupDirection;
  currentType?: LineType;
  currentCurve?: CurveType;
  onChange?: (lineType: LineType, curveType?: CurveType) => void;
  jump?: boolean;
  onJumpChange?: (val: boolean) => void;
  polygonType?: PolygonType;
  onPolygonChange?: (val: boolean, polyline?: boolean) => void;
  canMakePolygon?: boolean;
  hidePolygon?: boolean;
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
  polygonType,
  onPolygonChange,
  canMakePolygon,
  hidePolygon,
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

  const buttonIcon = useMemo(() => {
    if (!polygonType || polygonType === "line") return selected.icon;
    return POLYGON_TYPE_LIST.find((v) => v.type === polygonType)?.icon ?? selected.icon;
  }, [polygonType, selected]);

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="line-type"
        opened={popupedKey === "line-type"}
        popup={
          <LineTypePanel
            itemType={selected.type}
            onTypeClick={onChange}
            jump={jump}
            onJumpChange={onJumpChange}
            polygonType={polygonType ?? "line"}
            onPolygonChange={onPolygonChange}
            canMakePolygon={canMakePolygon}
            hidePolygon={hidePolygon}
          />
        }
        onClick={setPopupedKey}
        defaultDirection={defaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={buttonIcon} alt="Line type" />
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
  polygonType: PolygonType;
  onPolygonChange?: (val: boolean, polyline?: boolean) => void;
  canMakePolygon?: boolean;
  hidePolygon?: boolean;
}

const LineTypePanel: React.FC<LineTypePanelProps> = ({
  itemType,
  onTypeClick,
  jump,
  onJumpChange,
  polygonType,
  onPolygonChange,
  canMakePolygon,
  hidePolygon,
}) => {
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

  const options = useMemo(
    () =>
      LINE_LIST.map((item) => ({
        value: item.type,
        element: <img src={item.icon} alt="" className="w-8 h-8 p-1" />,
      })),
    [],
  );

  const polygonTypeOptions = useMemo(
    () =>
      POLYGON_TYPE_LIST.map((item) => ({
        value: item.type,
        element: <img src={item.icon} alt="" className="w-8 h-8 p-1" />,
      })),
    [],
  );

  const handlePolygonChange = useCallback(
    (val: PolygonType) => {
      switch (val) {
        case "polyline": {
          onPolygonChange?.(true, true);
          return;
        }
        case "polygon": {
          onPolygonChange?.(true);
          return;
        }
        default: {
          onPolygonChange?.(false);
          return;
        }
      }
    },
    [onPolygonChange],
  );

  return (
    <div className="p-2 flex flex-col gap-1 w-max">
      {polygonType !== "line" ? undefined : (
        <>
          <InlineField label={<AppText portal>Type</AppText>}>
            <RadioSelectInput value={itemType} options={options} onChange={handleTypeClick} />
          </InlineField>
          <InlineField label={<AppText portal>[[LINE_JUMP]]</AppText>}>
            <ToggleInput value={jump} onChange={onJumpChange} />
          </InlineField>
        </>
      )}
      {hidePolygon ? undefined : (
        <InlineField label=<AppText portal>[[MAKE_POLYGON]]</AppText> inert={polygonType === "line" && !canMakePolygon}>
          <RadioSelectInput options={polygonTypeOptions} value={polygonType} onChange={handlePolygonChange} />
        </InlineField>
      )}
    </div>
  );
};
