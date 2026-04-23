import { useCallback, useMemo } from "react";
import { ColorPickerPanel } from "../../molecules/ColorPickerPanel";
import { Color } from "../../../models";
import { COLORS, getColorText, parseColorText } from "../../../utils/color";

interface Props {
  value?: string;
  onChanged?: (color: string, draft?: boolean) => void;
}

export const TextColorPanel: React.FC<Props> = ({ value, onChanged }) => {
  const color = useMemo(() => {
    return value ? parseColorText(value) : undefined;
  }, [value]);

  const onColorChange = useCallback(
    (val: Partial<Color>, draft = false) => {
      const current = color ?? COLORS.BLACK;
      onChanged?.(getColorText({ ...current, ...val }), draft);
    },
    [onChanged, color],
  );

  return (
    <div className="p-2">
      <div>
        <ColorPickerPanel color={color} onChange={onColorChange} />
      </div>
    </div>
  );
};
