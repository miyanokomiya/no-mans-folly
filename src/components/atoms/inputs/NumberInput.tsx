import { useCallback, useEffect, useRef, useState } from "react";
import { PointerMoveArgs, usePointerLock } from "../../../hooks/pointerLock";
import { clamp } from "okageo";

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
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autofocus) ref.current?.focus();
  }, [autofocus]);

  const [textValue, setTextValue] = useState(value.toString());

  useEffect(() => {
    setTextValue(value.toString());
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
      startValue.current = value;
      startLock(e.nativeEvent);
    },
    [value, startLock],
  );

  return (
    <div className={"w-full flex items-center border" + (locked ? " border-blue-400" : "")}>
      <input
        ref={ref}
        type="text"
        data-keep-focus={keepFocus}
        value={textValue}
        onChange={handleChange}
        onBlur={onBlur}
        className={"py-1 px-2 w-full text-right" + (slider ? " rounded-l" : " rounded")}
        placeholder={placeholder}
      />
      {slider ? (
        <div
          className="w-4 h-8 bg-gray-300 cursor-col-resize rounded-r"
          onMouseDown={handleDownSlider}
          onMouseUp={stopLock}
        />
      ) : undefined}
    </div>
  );
};
