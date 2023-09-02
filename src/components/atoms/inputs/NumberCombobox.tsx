import { useCallback, useState } from "react";

interface Props {
  value: number;
  options: { value: number; label: string }[];
  min?: number;
  max?: number;
  onChanged?: (value: number, draft?: boolean) => void;
}

export const NumberCombobox: React.FC<Props> = ({ value, options, min = -Infinity, max = Infinity, onChanged }) => {
  const [draftValue, setDraftValue] = useState(value);
  const [opened, setOpened] = useState(false);

  const onFocused = useCallback(() => {
    setOpened(true);
  }, []);

  const onSelected = useCallback(
    (e: React.MouseEvent) => {
      setOpened(false);
      const v = parseFloat(e.currentTarget.getAttribute("data-value")!);
      onChanged?.(v);
    },
    [onChanged]
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setOpened(false);
      const val = Math.min(Math.max(draftValue, min), max);
      onChanged?.(val);
    },
    [onChanged, draftValue, min, max]
  );

  const onInput = useCallback(
    (e: any) => {
      const value = e.target.value;
      setDraftValue(value);
      const val = Math.min(Math.max(value, min), max);
      onChanged?.(val, true);
    },
    [min, max, onChanged]
  );

  return (
    <div className="relative w-full">
      <form action="" className="w-full" onSubmit={onSubmit}>
        <input
          type="number"
          className="border rounded w-full text-right px-2 py-1"
          value={value}
          onFocus={onFocused}
          onInput={onInput}
        />
        <button type="submit" className="hidden"></button>
      </form>
      {opened ? (
        <div
          className="absolute bottom-0 left-0 right-0 bg-white text-right border rounded shadow-md"
          style={{ transform: "translateY(100%)" }}
        >
          <div className="flex flex-col gap-1 py-1">
            {options.map((o) => (
              <button
                type="button"
                className="hover:bg-gray-200 p-1"
                key={o.value}
                data-value={o.value}
                onClick={onSelected}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ) : undefined}
    </div>
  );
};
