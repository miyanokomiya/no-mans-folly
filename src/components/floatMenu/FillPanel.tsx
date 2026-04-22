import { useCallback } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color, FillStyle } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { resolveColor } from "../../utils/color";
import { useColorPalette } from "../../hooks/storeHooks";

interface Props {
  fill: FillStyle;
  onChanged?: (fill: Partial<FillStyle>, draft?: boolean) => void;
}

export const FillPanel: React.FC<Props> = ({ fill, onChanged }) => {
  const palette = useColorPalette();
  const resolvedColor = resolveColor(fill.color, palette);

  const onColorChange = useCallback(
    (color: Color, draft = false) => {
      onChanged?.({ color: { ...resolveColor(color, palette), a: resolvedColor.a }, disabled: false }, draft);
    },
    [onChanged, palette, resolvedColor],
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.({ color: { ...resolvedColor, a: val }, disabled: false }, draft);
    },
    [onChanged, resolvedColor],
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
        <div className="mt-2 flex items-center">
          <span>Alpha:</span>
          <div className="ml-2 flex-1">
            <SliderInput min={0} max={1} step={0.1} value={resolvedColor.a} onChanged={onAlphaChanged} showValue />
          </div>
        </div>
        <div className="mt-2">
          <ColorPickerPanel color={fill.color} onChange={onColorChange} />
        </div>
      </div>
    </div>
  );
};
