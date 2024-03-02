import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onChange?: (val: number) => void;
  onBlur?: () => void;
  autofocus?: boolean;
  keepFocus?: boolean;
  placeholder?: string;
}

export const NumberInput: React.FC<Props> = ({ value, onChange, onBlur, autofocus, keepFocus, placeholder }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autofocus) ref.current?.focus();
  }, [autofocus]);

  const [textValue, setTextValue] = useState(value.toString());

  useEffect(() => {
    setTextValue(value.toString());
  }, [value]);

  const handleChange = useCallback(
    (e: any) => {
      const v = e.target.value;
      setTextValue(v);
      if (!/^[+-]?((\d+(\.\d*)?)|(\.\d+))$/.test(v)) return;

      onChange?.(parseFloat(v));
    },
    [onChange],
  );

  return (
    <input
      ref={ref}
      type="text"
      data-keep-focus={keepFocus}
      value={textValue}
      onChange={handleChange}
      onBlur={onBlur}
      className="border rounded py-1 px-2 w-full text-right"
      placeholder={placeholder}
    />
  );
};
