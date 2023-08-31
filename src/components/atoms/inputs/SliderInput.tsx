import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "../../../composables/window";
import { snapNumber } from "../../../utils/geometry";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChanged?: (value: number, draft?: boolean) => void;
}

export const SliderInput: React.FC<Props> = ({ value, min, max, step, onChanged }) => {
  const length = max - min;
  const [draft, _setDraft] = useState(value / length);
  const [down, setDown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    _setDraft(value);
  }, [value]);

  const setDraft = useCallback(
    (rate: number, tmp = false) => {
      const v = Math.min(Math.max(rate, 0), 1);
      const val = step ? snapNumber(v, step) : v;
      _setDraft(val);

      if (tmp) {
        onChanged?.(val, true);
      }
    },
    [step, onChanged]
  );

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;

      e.preventDefault();
      setDown(true);
      const bounds = ref.current.getBoundingClientRect();
      setDraft((e.pageX - bounds.x) / bounds.width, true);
    },
    [setDraft]
  );

  const onUp = useCallback(() => {
    if (!ref.current) return;

    setDown(false);
    onChanged?.(draft);
  }, [onChanged, draft]);
  useGlobalMouseupEffect(onUp);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current || !down) return;

      const bounds = ref.current.getBoundingClientRect();
      setDraft((e.pageX - bounds.x) / bounds.width, true);
    },
    [down, setDraft]
  );
  useGlobalMousemoveEffect(onMove);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="relative bg-white border rounded-full overflow-hidden h-4 cursor-pointer"
        onMouseDown={onDown}
      >
        <div
          className="absolute top-0 left-0 h-4 bg-sky-400 pointer-events-none"
          style={{
            right: `${(1 - draft) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
};
