import { useCallback } from "react";

interface Props {
  value: string;
  options: Readonly<{ value: string; label: string }[]>;
  onChange?: (val: string) => void;
}

export const SelectInput: React.FC<Props> = ({ value, options, onChange }) => {
  const handleChange = useCallback(
    (e: any) => {
      const v = e.target.value;
      onChange?.(v);
    },
    [onChange],
  );

  return (
    <select value={value} onChange={handleChange} className="border rounded py-1 px-2 w-full">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
};
