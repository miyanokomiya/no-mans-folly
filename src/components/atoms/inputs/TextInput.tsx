import { useCallback, useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange?: (val: string) => void;
  onBlur?: () => void;
  autofocus?: boolean;
  keepFocus?: boolean;
}

export const TextInput: React.FC<Props> = ({ value, onChange, onBlur, autofocus, keepFocus }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autofocus) ref.current?.focus();
  }, [autofocus]);

  const _onChange = useCallback(
    (e: any) => {
      const v = e.target.value;
      onChange?.(v);
    },
    [onChange],
  );

  return (
    <input
      ref={ref}
      type="text"
      data-keep-focus={keepFocus}
      value={value}
      onChange={_onChange}
      onBlur={onBlur}
      className="border rounded py-1 px-2 w-full"
    />
  );
};
