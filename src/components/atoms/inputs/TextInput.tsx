import { useCallback, useEffect, useRef } from "react";
import iconDelete from "../../../assets/icons/delete_filled.svg";

interface Props {
  value: string;
  onChange?: (val: string) => void;
  onBlur?: () => void;
  autofocus?: boolean;
  keepFocus?: boolean;
  placeholder?: string;
  clearable?: boolean;
  readonly?: boolean;
}

export const TextInput: React.FC<Props> = ({
  value,
  onChange,
  onBlur,
  autofocus,
  keepFocus,
  placeholder,
  clearable,
  readonly,
}) => {
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

  const handleClear = useCallback(() => {
    onChange?.("");
    ref.current?.focus();
  }, [onChange]);

  return (
    <span className="relative">
      <input
        ref={ref}
        type="text"
        data-keep-focus={keepFocus}
        value={value}
        onChange={_onChange}
        onBlur={onBlur}
        className="border rounded-xs py-1 px-2 w-full"
        placeholder={placeholder}
        readOnly={readonly}
      />
      {clearable && value ? (
        <button
          type="button"
          className="absolute top-0 bottom-0 right-0 w-6 flex justify-center items-center"
          onClick={handleClear}
        >
          <img className="w-4 h-4" src={iconDelete} alt="Clear" />
        </button>
      ) : undefined}
    </span>
  );
};
