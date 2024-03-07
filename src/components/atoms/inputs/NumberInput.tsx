import { useCallback, useEffect, useRef, useState } from "react";
import { PointerMoveArgs, usePointerLock } from "../../../hooks/pointerLock";
import { clamp } from "okageo";
import { logRoundByDigit } from "../../../utils/geometry";

interface Props {
  value: number;
  onChange?: (val: number, draft?: boolean) => void;
  onBlur?: () => void;
  autofocus?: boolean;
  keepFocus?: boolean;
  placeholder?: string;
  slider?: boolean;
  max?: number;
  min?: number;
  disabled?: boolean;
}

export const NumberInput: React.FC<Props> = ({
  value,
  onChange,
  onBlur,
  autofocus,
  keepFocus,
  placeholder,
  slider,
  max,
  min,
  disabled,
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autofocus) ref.current?.focus();
  }, [autofocus]);

  const [textValue, setTextValue] = useState(value.toString());

  useEffect(() => {
    // Trim to avoid showing floating-point error.
    setTextValue(logRoundByDigit(6, value).toString());
  }, [value]);

  const adjustValue = useCallback(
    (v: number) => {
      return clamp(min, max, v);
    },
    [min, max],
  );

  const handleChange = useCallback(
    (e: any) => {
      const v = e.target.value;
      setTextValue(v);
      if (!/^[+-]?((\d+(\.\d*)?)|(\.\d+))$/.test(v)) return;

      onChange?.(adjustValue(parseFloat(v)), true);
    },
    [onChange, adjustValue],
  );

  const startValue = useRef(value);

  const handlePointerLockMove = useCallback(
    (args: PointerMoveArgs) => {
      const next = Math.round(startValue.current + args.totalDelta.x);
      onChange?.(adjustValue(next), true);
    },
    [onChange, adjustValue],
  );

  const handlePointerLockEnd = useCallback(
    (args?: PointerMoveArgs) => {
      if (!args) return;

      const next = Math.round(startValue.current + args.totalDelta.x);
      onChange?.(adjustValue(next));
    },
    [onChange, adjustValue],
  );

  const [startLock, stopLock, locked] = usePointerLock({
    onMove: handlePointerLockMove,
    onEnd: handlePointerLockEnd,
    onEscape: handlePointerLockEnd,
  });

  const handleDownSlider = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      startValue.current = value;
      startLock(e.nativeEvent);
    },
    [value, startLock, disabled],
  );

  const siderView = slider && !disabled;
  const inputClass = [
    "py-1 px-2 w-full text-right",
    siderView ? "rounded-l" : "rounded",
    disabled ? " bg-gray-100" : "",
  ].join(" ");

  return (
    <div className={"w-full flex items-center border" + (locked ? " border-blue-400" : "")}>
      <input
        ref={ref}
        type="text"
        data-keep-focus={keepFocus}
        value={textValue}
        onChange={handleChange}
        onBlur={onBlur}
        className={inputClass}
        placeholder={placeholder}
        disabled={disabled}
      />
      {siderView ? (
        <div
          className="w-4 h-8 bg-gray-300 cursor-col-resize rounded-r"
          onMouseDown={handleDownSlider}
          onMouseUp={stopLock}
        />
      ) : undefined}
    </div>
  );
};
