import { useCallback } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color, FillStyle } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

interface Props {
  fill: FillStyle;
  onChanged?: (fill: FillStyle, draft?: boolean) => void;
}

export const FillPanel: React.FC<Props> = ({ fill, onChanged }) => {
  const onColorChange = useCallback(
    (color: Color, draft = false) => {
      onChanged?.({ ...fill, color: { ...color, a: fill.color.a } }, draft);
    },
    [fill, onChanged],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ ...fill, color: { ...fill.color, a: val } }, draft);
    },
    [onChanged, fill],
  );

  const onDisabledChanged = useCallback(
    (val: boolean) => {
      onChanged?.({ ...fill, disabled: val });
    },
    [onChanged, fill],
  );

  return (
    <div className="p-2">
      <div className="flex justify-end">
        <ToggleInput value={fill.disabled} onChange={onDisabledChanged}>
          Disabled
        </ToggleInput>
      </div>
      <div className={fill.disabled ? "opacity-50 pointer-events-none" : ""}>
        <div className="mt-2 flex items-center">
          <span>Alpha:</span>
          <div className="ml-2 flex-1">
            <SliderInput min={0} max={1} step={0.1} value={fill.color.a} onChanged={onAlphaChanged} showValue />
          </div>
        </div>
        <div className="mt-2">
          <ColorPickerPanel color={fill.color} onChange={onColorChange} />
        </div>
      </div>
    </div>
  );
};
