import { Color } from "../../models";
import { PopupButton } from "../atoms/PopupButton";
import { ColorPickerPanel } from "./ColorPickerPanel";
import { rednerRGBA } from "../../utils/color";

interface Props {
  name: string;
  popupedKey: string;
  setPopupedKey: (val?: string) => void;
  color: Color;
  onChange?: (color: Color, draft?: boolean) => void;
}

export const ColorPickerButton: React.FC<Props> = ({ name, popupedKey, setPopupedKey, color, onChange }) => {
  return (
    <PopupButton
      name={name}
      opened={popupedKey === name}
      popup={
        <div className="p-2">
          <ColorPickerPanel color={color} onChange={onChange} />
        </div>
      }
      onClick={setPopupedKey}
      popupPosition="left"
    >
      <div className="w-6 h-6 border-2 rounded-full" style={{ backgroundColor: rednerRGBA(color) }} />
    </PopupButton>
  );
};
