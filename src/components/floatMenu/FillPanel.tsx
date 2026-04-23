import { useCallback } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color, FillStyle } from "../../models";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

interface Props {
  fill: FillStyle;
  onChanged?: (fill: Partial<FillStyle>, draft?: boolean) => void;
}

export const FillPanel: React.FC<Props> = ({ fill, onChanged }) => {
  const onColorChange = useCallback(
    (color: Partial<Color>, draft = false) => {
      onChanged?.({ color: { ...fill.color, ...color }, disabled: false }, draft);
    },
    [onChanged, fill],
  );

  const onDisabledChanged = useCallback(
    (val: boolean) => {
      onChanged?.({ disabled: val });
    },
    [onChanged],
  );

  return (
    <div className="p-2">
      <div className="flex justify-end">
        <ToggleInput value={fill.disabled} onChange={onDisabledChanged}>
          Disabled
        </ToggleInput>
      </div>
      <div className={fill.disabled ? "opacity-50" : ""}>
        <ColorPickerPanel color={fill.color} onChange={onColorChange} />
      </div>
    </div>
  );
};
