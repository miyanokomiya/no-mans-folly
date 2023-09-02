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
          data-keep-focus
          className="border rounded w-full text-right px-2 py-1"
          value={value}
          onFocus={onFocused}
          onInput={onInput}
        />
        <button type="submit" className="hidden"></button>
      </form>
      {opened ? (
        <div
          className="absolute left-1/2 bottom-0 bg-white text-right border rounded shadow-md"
          style={{ transform: "translate(-50%, 100%)" }}
        >
          <div className="flex gap-1 p-1">
            {options.map((o) => (
              <button
                type="button"
                className="hover:bg-gray-200 px-2 py-1 rounded"
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
