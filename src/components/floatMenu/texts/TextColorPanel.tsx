import { useCallback, useMemo } from "react";
import { ColorPickerPanel } from "../../molecules/ColorPickerPanel";
import { Color, RGBA } from "../../../models";
import { COLORS, parseRGBA, rednerRGBA, resolveColor } from "../../../utils/color";
import { SliderInput } from "../../atoms/inputs/SliderInput";
import { useColorPalette } from "../../../hooks/storeHooks";

interface Props {
  value?: string;
  onChanged?: (color: string, draft?: boolean) => void;
}

export const TextColorPanel: React.FC<Props> = ({ value, onChanged }) => {
  const palette = useColorPalette();
  const color = useMemo<Color>(() => {
    return (value ? parseRGBA(value) : undefined) ?? COLORS.BLACK;
  }, [value]);

  const resolvedColor = useMemo<RGBA>(() => resolveColor(color, palette), [color, palette]);

  const onAlphaChanged = useCallback(
    (val: number, draft = false) => {
      onChanged?.(rednerRGBA({ ...resolvedColor, a: val }), draft);
    },
    [onChanged, resolvedColor],
  );

  const onColorChange = useCallback(
    (val: Color, draft = false) => {
      onChanged?.(rednerRGBA({ ...resolveColor(val, palette), a: resolvedColor.a }), draft);
    },
    [onChanged, resolvedColor, palette],
  );

  return (
    <div className="p-2">
      <div>
        <div className="mt-2">
          <SliderInput min={0} max={1} value={resolvedColor.a} onChanged={onAlphaChanged} />
        </div>
        <div className="mt-2">
          <ColorPickerPanel color={color} onChange={onColorChange} />
        </div>
      </div>
    </div>
  );
};
