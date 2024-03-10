import { useCallback, useMemo, useState } from "react";
import { OutsideObserver } from "../OutsideObserver";

interface Props {
  value: number;
  options: { value: number; label: string }[];
  min?: number;
  max?: number;
  onChanged?: (value: number, draft?: boolean) => void;
  onActivate?: () => void;
  defaultDirection?: "bottom" | "top";
}

export const NumberCombobox: React.FC<Props> = ({
  value,
  options,
  min = -Infinity,
  max = Infinity,
  onChanged,
  onActivate,
  defaultDirection,
}) => {
  const [draftValue, setDraftValue] = useState(value);
  const [opened, setOpened] = useState(false);

  const onFocused = useCallback(() => {
    setOpened(true);
    onActivate?.();
  }, [onActivate]);

  const close = useCallback(() => {
    setOpened(false);
  }, []);
  const onSelected = useCallback(
    (e: React.MouseEvent) => {
      close();
      const v = parseFloat(e.currentTarget.getAttribute("data-value")!);
      onChanged?.(v);
    },
    [close, onChanged],
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      close();
      const val = Math.min(Math.max(draftValue, min), max);
      onChanged?.(val);
    },
    [close, onChanged, draftValue, min, max],
  );

  const onInput = useCallback(
    (e: any) => {
      const value = e.target.value;
      setDraftValue(value);
      const val = Math.min(Math.max(value, min), max);
      onChanged?.(val, true);
    },
    [min, max, onChanged],
  );

  const popupAttrs = useMemo(() => {
    const base = "absolute left-1/2 bg-white text-right border rounded shadow-md z-10";
    return defaultDirection === "top"
      ? {
          className: base + " top-0",
          style: { transform: "translate(-50%, -100%)" },
        }
      : {
          className: base + " bottom-0",
          style: { transform: "translate(-50%, 100%)" },
        };
  }, [defaultDirection]);

  return (
    <OutsideObserver className="relative w-full" onClick={close}>
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
        <div {...popupAttrs}>
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
    </OutsideObserver>
  );
};
