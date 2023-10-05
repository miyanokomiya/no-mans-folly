import { useCallback, useRef, useState } from "react";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "../../../composables/window";
import { logRoundByDigit, snapNumber } from "../../../utils/geometry";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  onChanged?: (value: number, draft?: boolean) => void;
}

export const SliderInput: React.FC<Props> = ({ value, min, max, step, showValue, onChanged }) => {
  const [draftValue, setDraftValue] = useState(value);
  const [down, setDown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const updateValue = useCallback(
    (rate: number, tmp = false) => {
      const v = Math.min(Math.max(rate, 0), 1) * (max - min) + min;
      // Apply "logRoundByDigit" to avoid floating error as much as possible.
      // => Because the value is likely shown as text label.
      const val = step ? logRoundByDigit(step.toString().length + 3, snapNumber(v, step)) : v;
      setDraftValue(val);

      if (tmp) {
        onChanged?.(val, true);
      }
    },
    [step, max, min, onChanged]
  );

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;

      e.preventDefault();
      setDown(true);
      const bounds = ref.current.getBoundingClientRect();
      updateValue((e.pageX - bounds.x) / bounds.width, true);
    },
    [updateValue]
  );

  const onUp = useCallback(() => {
    if (!ref.current || !down) return;

    setDown(false);
    // Use "draftValue", because "value" in this scope can be outdated.
    onChanged?.(draftValue);
  }, [onChanged, draftValue, down]);
  useGlobalMouseupEffect(onUp);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current || !down) return;

      const bounds = ref.current.getBoundingClientRect();
      updateValue((e.pageX - bounds.x) / bounds.width, true);
    },
    [down, updateValue]
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
            right: `${(1 - (value - min) / (max - min)) * 100}%`,
          }}
        ></div>
        {showValue ? (
          <span
            className="absolute top-1/2 left-1/2 leading-4 pointer-events-none"
            style={{ transform: "translate(-50%,-50%)" }}
          >
            {value}
          </span>
        ) : undefined}
      </div>
    </div>
  );
};
