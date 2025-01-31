import { useCallback } from "react";
import { ModifierOptions } from "../../utils/devices";
import { LongPressStarter } from "../atoms/LongPressStarter";

interface Props {
  value: ModifierOptions;
  onChange?: (val: ModifierOptions) => void;
}

export const ModifierSupportPanel: React.FC<Props> = ({ value, onChange }) => {
  const handleChange = useCallback(
    (key: keyof ModifierOptions, val: boolean) => {
      const next = { ...value };
      if (val) {
        next[key] = true;
      } else {
        delete next[key];
      }
      onChange?.(next);
    },
    [value, onChange],
  );

  return (
    <div className="flex gap-2">
      <ModifierButton modifier="shift" value={value.shift} onChange={handleChange}>
        Shift
      </ModifierButton>
      <ModifierButton modifier="ctrl" value={value.ctrl} onChange={handleChange}>
        Ctrl
      </ModifierButton>
      <ModifierButton modifier="alt" value={value.alt} onChange={handleChange}>
        Alt
      </ModifierButton>
    </div>
  );
};

interface ModifierButtonProps {
  modifier: keyof ModifierOptions;
  value?: boolean;
  onChange?: (key: keyof ModifierOptions, val: boolean) => void;
  children: React.ReactNode;
}

const ModifierButton: React.FC<ModifierButtonProps> = ({ modifier, value, onChange, children }) => {
  const handleDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onChange?.(modifier, true);
    },
    [modifier, onChange],
  );

  const handleUp = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onChange?.(modifier, false);
    },
    [modifier, onChange],
  );

  return (
    <LongPressStarter>
      <button
        type="button"
        className={"border rounded-xs w-14 h-12 touch-none " + (value ? "bg-lime-200" : "bg-gray-200")}
        onPointerDown={handleDown}
        onPointerUp={handleUp}
      >
        {children}
      </button>
    </LongPressStarter>
  );
};
