import { useCallback } from "react";

type ValueType = string;

interface Props<T extends ValueType> {
  value: T;
  options: Readonly<{ value: T; label: string }[]>;
  onChange?: (val: T) => void;
  keepFocus?: boolean;
}

export function SelectInput<T extends ValueType>({
  value,
  options,
  onChange,
  keepFocus,
}: React.PropsWithChildren<Props<T>>): React.ReactElement {
  const handleChange = useCallback(
    (e: any) => {
      const v = e.target.value;
      onChange?.(v);
    },
    [onChange],
  );

  return (
    <select
      value={value}
      onChange={handleChange}
      className="border rounded py-1 px-2 w-full"
      data-keep-focus={keepFocus}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
