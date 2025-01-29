import { useCallback } from "react";

type ValueType = string | undefined;

interface Props<T extends ValueType> {
  value: T;
  options: Readonly<{ value: T; element: React.ReactNode }[]>;
  onChange?: (val: T) => void;
}

export function RadioSelectInput<T extends ValueType>({
  value,
  options,
  onChange,
}: React.PropsWithChildren<Props<T>>): React.ReactElement {
  const handleChange = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const v = e.currentTarget.value as T;
      onChange?.(v);
    },
    [onChange],
  );

  return (
    <ul className="w-max flex items-center border border-gray-300 rounded-lg divide-x divide-gray-300">
      {options.map((o) => (
        <li key={o.value} className="flex items-center">
          <button type="button" value={o.value} onClick={handleChange} className={getItemClassName(o.value === value)}>
            {o.element}
          </button>
        </li>
      ))}
    </ul>
  );
}

function getItemClassName(selected: boolean) {
  return selected ? "bg-sky-200" : "hover:bg-gray-200";
}
