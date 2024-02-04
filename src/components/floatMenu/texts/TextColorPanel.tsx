import { useCallback, useMemo } from "react";
import { ColorPickerPanel } from "../../molecules/ColorPickerPanel";
import { Color } from "../../../models";
import { COLORS, parseRGBA, rednerRGBA } from "../../../utils/color";
import { SliderInput } from "../../atoms/inputs/SliderInput";

interface Props {
  value?: string;
  onChanged?: (color: string, draft?: boolean) => void;
}

export const TextColorPanel: React.FC<Props> = ({ value, onChanged }) => {
  const color = useMemo<Color>(() => {
    return (value ? parseRGBA(value) : undefined) ?? COLORS.BLACK;
  }, [value]);

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.(rednerRGBA({ ...color, a: val }), draft);
    },
    [onChanged, color],
  );

  const onColorChange = useCallback(
    (val: Color, draft = false) => {
      onChanged?.(rednerRGBA({ ...val, a: color.a }), draft);
    },
    [onChanged, color],
  );

  return (
    <div className="p-2">
      <div>
        <div className="mt-2">
          <SliderInput min={0} max={1} value={color.a} onChanged={onAlphaChanged} />
        </div>
        <div className="mt-2">
          <ColorPickerPanel color={color} onChange={onColorChange} />
        </div>
      </div>
    </div>
  );
};
