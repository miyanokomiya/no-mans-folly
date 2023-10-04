import { useCallback, useMemo } from "react";
import { ColorPickerPanel } from "../../molecules/ColorPickerPanel";
import { Color } from "../../../models";
import { COLORS, parseRGBA, rednerRGBA } from "../../../utils/color";
import { ToggleInput } from "../../atoms/inputs/ToggleInput";
import { SliderInput } from "../../atoms/inputs/SliderInput";

interface Props {
  value?: string;
  onChanged?: (color?: string, draft?: boolean) => void;
}

export const TextBackgroundPanel: React.FC<Props> = ({ value, onChanged }) => {
  const color = useMemo(() => {
    return value ? parseRGBA(value) : undefined;
  }, [value]);

  const onDisabledChanged = useCallback(
    (val: boolean) => {
      onChanged?.(val ? undefined : rednerRGBA(COLORS.YELLOW));
    },
    [onChanged]
  );

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      if (!color) return;

      onChanged?.(rednerRGBA({ ...color, a: val }), draft);
    },
    [onChanged, color]
  );

  const onColorClick = useCallback(
    (val: Color) => {
      if (!color) return;

      onChanged?.(rednerRGBA({ ...val, a: color.a }));
    },
    [onChanged, color]
  );

  return (
    <div className="p-2">
      <div className="flex justify-end">
        <ToggleInput value={!color} onChange={onDisabledChanged}>
          Disabled
        </ToggleInput>
      </div>
      <div className={!color ? "opacity-50 pointer-events-none" : ""}>
        <div className="mt-2">
          <SliderInput min={0} max={1} value={color?.a ?? 1} onChanged={onAlphaChanged} />
        </div>
        <div className="mt-2">
          <ColorPickerPanel onClick={onColorClick} />
        </div>
      </div>
    </div>
  );
};
