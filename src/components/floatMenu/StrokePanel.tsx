import { useCallback } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color, StrokeStyle } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

interface Props {
  stroke: StrokeStyle;
  onChanged?: (stroke: StrokeStyle, draft?: boolean) => void;
}

export const StrokePanel: React.FC<Props> = ({ stroke, onChanged }) => {
  const onColorClick = useCallback(
    (color: Color) => {
      onChanged?.({ ...stroke, color: { ...color, a: stroke.color.a } });
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

  return (
    <div className="p-2">
      <div className="flex justify-end">
        <ToggleInput value={stroke.disabled} onChange={onDisabledChanged}>
          Disabled
        </ToggleInput>
      </div>
      <div className="mt-2">
        <SliderInput min={1} max={10} step={1} value={stroke.width ?? 1} onChanged={onWidthChanged} />
      </div>
      <div className={stroke.disabled ? "opacity-50 pointer-events-none" : ""}>
        <div className="mt-2">
          <SliderInput min={0} max={1} value={stroke.color.a} onChanged={onAlphaChanged} />
        </div>
        <div className="mt-2">
          <ColorPickerPanel onClick={onColorClick} />
        </div>
      </div>
    </div>
  );
};
