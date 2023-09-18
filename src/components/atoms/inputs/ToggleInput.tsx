import { useCallback } from "react";

interface Props {
  value?: boolean;
  onChange?: (val: boolean) => void;
  children?: React.ReactNode;
}

export const ToggleInput: React.FC<Props> = ({ value, onChange, children }) => {
  const onClick = useCallback(() => {
    onChange?.(!value);
  }, [value, onChange]);

  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2">
      <input type="checkbox" checked={value} readOnly />
      {children}
    </button>
  );
};
