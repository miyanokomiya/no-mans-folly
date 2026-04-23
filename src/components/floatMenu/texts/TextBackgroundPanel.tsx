import { useCallback, useMemo } from "react";
import { ColorPickerPanel } from "../../molecules/ColorPickerPanel";
import { Color } from "../../../models";
import { COLORS, getColorText, parseColorText, rednerRGBA } from "../../../utils/color";
import { ToggleInput } from "../../atoms/inputs/ToggleInput";

interface Props {
  value?: string;
  onChanged?: (color?: string, draft?: boolean) => void;
}

export const TextBackgroundPanel: React.FC<Props> = ({ value, onChanged }) => {
  const color = useMemo(() => {
    return value ? parseColorText(value) : undefined;
  }, [value]);

  const onDisabledChanged = useCallback(
    (val: boolean) => {
      onChanged?.(val ? undefined : rednerRGBA(COLORS.YELLOW));
    },
    [onChanged],
  );

  const onColorChange = useCallback(
    (val: Partial<Color>, draft = false) => {
      const current = color ?? COLORS.YELLOW;
      onChanged?.(getColorText({ ...current, ...val }), draft);
    },
    [onChanged, color],
  );

  return (
    <div className="p-2">
      <div className="flex justify-end">
        <ToggleInput value={!color} onChange={onDisabledChanged}>
          Disabled
        </ToggleInput>
      </div>
      <div className={!color ? "opacity-50" : ""}>
        <ColorPickerPanel color={color} onChange={onColorChange} />
      </div>
    </div>
  );
};
