import { useCallback } from "react";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { Color } from "../../models";
import { colorToHex } from "../../utils/color";

interface Props {
  onChanged?: (color: string, draft?: boolean) => void;
}

export const TextColorPanel: React.FC<Props> = ({ onChanged }) => {
  const onColorClick = useCallback(
    (color: Color) => {
      onChanged?.(colorToHex(color));
    },
    [onChanged]
  );

  return (
    <div>
      <ColorPickerPanel onClick={onColorClick} />
    </div>
  );
};
