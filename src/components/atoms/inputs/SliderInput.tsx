import { useCallback, useRef } from "react";
import { useGlobalDrag } from "../../../hooks/window";
import { logRoundByDigit, snapNumber } from "../../../utils/geometry";
import { ModifierOptions, getModifierOptions } from "../../../utils/devices";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  showValue?: boolean;
  onChanged?: (value: number, draft?: boolean, option?: ModifierOptions) => void;
}

export const SliderInput: React.FC<Props> = ({ value, min, max, step, showValue, onChanged }) => {
  const ref = useRef<HTMLDivElement>(null);
  const draftValue = useRef(value);

  const applyStep = useCallback(
    (v: number) => {
      // Apply "logRoundByDigit" to avoid floating error as much as possible.
      // => Because the value is likely shown as text label.
      const val = step ? logRoundByDigit(step.toString().length + 3, snapNumber(v, step)) : v;
      return Math.min(Math.max(val, min), max);
    },
    [step, max, min],
  );

  const updateDraftValueByRate = useCallback(
    (rate: number, option?: ModifierOptions) => {
      const v = rate * (max - min) + min;
      const val = applyStep(v);
      draftValue.current = val;
      onChanged?.(val, true, option);
    },
    [applyStep, onChanged],
  );

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e: MouseEvent) => {
        if (!ref.current) return;

        const bounds = ref.current.getBoundingClientRect();
        updateDraftValueByRate((e.pageX - bounds.x) / bounds.width, getModifierOptions(e));
      },
      [updateDraftValueByRate],
    ),
    useCallback(() => {
      if (!ref.current) return;

      // Use "draftValue", because "value" in this scope can be outdated.
      onChanged?.(draftValue.current);
    }, [onChanged]),
  );

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;

      e.preventDefault();
      ref.current.focus();
      startDragging();
      const bounds = ref.current.getBoundingClientRect();
      updateDraftValueByRate((e.pageX - bounds.x) / bounds.width, getModifierOptions(e));
    },
    [updateDraftValueByRate, startDragging],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const unit = step ?? 1;
      let d = 0;

      switch (e.key) {
        case "ArrowRight": {
          d = unit;
          break;
        }
        case "ArrowUp": {
          d = unit * 10;
          break;
        }
        case "ArrowLeft": {
          d = -unit;
          break;
        }
        case "ArrowDown": {
          d = -unit * 10;
          break;
        }
      }

      if (d) {
        const v = applyStep(value + d);
        draftValue.current = v;
        onChanged?.(v, false, getModifierOptions(e));
      }
    },
    [value, applyStep, onChanged],
  );

  return (
    <div className="relative">
      <div
        ref={ref}
        className="relative bg-white border rounded-full overflow-hidden h-4 cursor-pointer"
        tabIndex={0}
        data-keep-focus
        onMouseDown={onDown}
        onKeyDown={onKeyDown}
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
