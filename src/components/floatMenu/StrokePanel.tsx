import { useCallback, useMemo } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color, LineDash, StrokeStyle } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { getLineDashArray } from "../../utils/strokeStyle";

const LINE_DASH_KEYS: LineDash[] = ["dot", "short", "long", "solid"];

interface Props {
  stroke: StrokeStyle;
  onChanged?: (stroke: StrokeStyle, draft?: boolean) => void;
}

export const StrokePanel: React.FC<Props> = ({ stroke, onChanged }) => {
  const onColorChange = useCallback(
    (color: Color, draft = false) => {
      onChanged?.({ ...stroke, color: { ...color, a: stroke.color.a } }, draft);
    },
    [stroke, onChanged],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ ...stroke, color: { ...stroke.color, a: val } }, draft);
    },
    [onChanged, stroke],
  );

  const onWidthChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ ...stroke, width: val }, draft);
    },
    [onChanged, stroke],
  );

  const onDisabledChanged = useCallback(
    (val: boolean) => {
      onChanged?.({ ...stroke, disabled: val });
    },
    [onChanged, stroke],
  );

  const onDashChanged = useCallback(
    (val: LineDash) => {
      onChanged?.({ ...stroke, dash: val === "solid" ? undefined : val });
    },
    [onChanged, stroke],
  );

  const dashButtons = useMemo(() => {
    return LINE_DASH_KEYS.map((lineDash) => {
      return <LineDashButton key={lineDash} lineDash={lineDash} onClick={onDashChanged} />;
    });
  }, [onDashChanged]);

  return (
    <div className="p-2">
      <div className="flex justify-end">
        <ToggleInput value={stroke.disabled} onChange={onDisabledChanged}>
          Disabled
        </ToggleInput>
      </div>
      <div className="mt-2 flex items-center">
        <span>Width:</span>
        <div className="ml-2 flex-1">
          <SliderInput min={1} max={20} step={1} value={stroke.width ?? 1} onChanged={onWidthChanged} showValue />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">{dashButtons}</div>
      <div className={stroke.disabled ? "opacity-50 pointer-events-none" : ""}>
        <div className="mt-2 flex items-center">
          <span>Alpha:</span>
          <div className="ml-2 flex-1">
            <SliderInput min={0} max={1} step={0.1} value={stroke.color.a} onChanged={onAlphaChanged} showValue />
          </div>
        </div>
        <div className="mt-2">
          <ColorPickerPanel color={stroke.color} onChange={onColorChange} />
        </div>
      </div>
    </div>
  );
};

interface LineDashButtonProps {
  lineDash: LineDash;
  onClick?: (lineDash: LineDash) => void;
}

const LineDashButton: React.FC<LineDashButtonProps> = ({ lineDash, onClick }) => {
  const dashArray = useMemo(() => {
    return getLineDashArray(lineDash, 4).join(" ");
  }, [lineDash]);

  const handleClick = useCallback(() => {
    onClick?.(lineDash);
  }, [lineDash, onClick]);

  return (
    <button
      type="button"
      className="w-10 h-10 p-1 flex item-center justify-center border rounded"
      onClick={handleClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <line stroke="#000" strokeWidth="4" strokeDasharray={dashArray} x1="2" y1="30" x2="30" y2="2" />
      </svg>
    </button>
  );
};
