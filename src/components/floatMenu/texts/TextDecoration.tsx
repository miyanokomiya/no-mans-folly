import { useCallback } from "react";
import { DocAttributes } from "../../../models/document";
import { PopupButton, PopupDirection } from "../../atoms/PopupButton";

interface Props {
  popupedKey: string;
  setPopupedKey: (key: string) => void;
  defaultDirection?: PopupDirection; // bottom by default
  value?: DocAttributes;
  onChange?: (val: DocAttributes) => void;
}

export const TextDecoration: React.FC<Props> = ({ popupedKey, setPopupedKey, defaultDirection, value, onChange }) => {
  return (
    <PopupButton
      name="decoration"
      opened={popupedKey === "decoration"}
      popup={<DecorationPanel value={value} onChange={onChange} />}
      onClick={setPopupedKey}
      defaultDirection={defaultDirection}
    >
      <div className="w-8 h-8 flex justify-center items-center">
        <div className="text-2xl pb-1 font-bold italic underline">D</div>
      </div>
    </PopupButton>
  );
};

interface DecorationPanelProps {
  value?: DocAttributes;
  onChange?: (val: DocAttributes) => void;
}

const DecorationPanel: React.FC<DecorationPanelProps> = ({ value, onChange }) => {
  const onChangeBold = useCallback(() => {
    onChange?.({ bold: !value?.bold });
  }, [value?.bold, onChange]);

  const onChangeItalic = useCallback(() => {
    onChange?.({ italic: !value?.italic });
  }, [value?.italic, onChange]);

  const onChangeUnderline = useCallback(() => {
    onChange?.({ underline: !value?.underline });
  }, [value?.underline, onChange]);

  const onChangeStrike = useCallback(() => {
    onChange?.({ strike: !value?.strike });
  }, [value?.strike, onChange]);

  return (
    <div className="flex gap-1">
      <button type="button" className={getButtonClass(!!value?.bold)} onClick={onChangeBold}>
        <div className="text-2xl pb-1 font-bold">B</div>
      </button>
      <button type="button" className={getButtonClass(!!value?.italic)} onClick={onChangeItalic}>
        <div className="text-2xl pb-1 italic">It</div>
      </button>
      <button type="button" className={getButtonClass(!!value?.underline)} onClick={onChangeUnderline}>
        <div className="text-2xl pb-1 underline">U</div>
      </button>
      <button type="button" className={getButtonClass(!!value?.strike)} onClick={onChangeStrike}>
        <div className="text-2xl pb-1 line-through">S</div>
      </button>
    </div>
  );
};

function getButtonClass(selected: boolean): string {
  return "w-8 h-8 flex justify-center items-center" + (selected ? " border-2 border-cyan-400" : "");
}
