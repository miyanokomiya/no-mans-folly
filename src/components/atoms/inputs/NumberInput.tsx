import { useCallback, useEffect, useRef, useState } from "react";
import { IVec2, sub } from "okageo";
import { useGlobalDrag } from "../../../hooks/window";

interface Props {
  value: number;
  onChange?: (val: number, draft?: boolean) => void;
  onBlur?: () => void;
  autofocus?: boolean;
  keepFocus?: boolean;
  placeholder?: string;
  slider?: boolean;
}

export const NumberInput: React.FC<Props> = ({
  value,
  onChange,
  onBlur,
  autofocus,
  keepFocus,
  placeholder,
  slider,
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autofocus) ref.current?.focus();
  }, [autofocus]);

  const [textValue, setTextValue] = useState(value.toString());

  useEffect(() => {
    setTextValue(value.toString());
  }, [value]);

  const handleChange = useCallback(
    (e: any) => {
      const v = e.target.value;
      setTextValue(v);
      if (!/^[+-]?((\d+(\.\d*)?)|(\.\d+))$/.test(v)) return;

      onChange?.(parseFloat(v), true);
    },
    [onChange],
  );

  const startValue = useRef(value);
  const dragFrom = useRef<IVec2>();
  const dragTo = useRef<IVec2>();
  const dragV = useRef<IVec2>();

  const handleDragMove = useCallback(() => {
    if (!dragV.current) return;

    const next = Math.round(startValue.current + dragV.current.x);
    onChange?.(next, true);
  }, [onChange]);

  const handleDragEnd = useCallback(() => {
    if (!dragV.current) return;

    const next = Math.round(startValue.current + dragV.current.x);
    onChange?.(next);
  }, [onChange]);

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e: MouseEvent) => {
        if (!dragFrom.current) return;

        e.preventDefault();
        dragV.current = sub({ x: e.pageX, y: e.pageX }, dragFrom.current);
        handleDragMove();
      },
      [handleDragMove],
    ),
    useCallback(() => {
      handleDragEnd();
      dragFrom.current = undefined;
      dragTo.current = undefined;
    }, [handleDragEnd]),
  );

  const handleDownSlider = useCallback(
    (e: React.MouseEvent) => {
      startValue.current = value;
      dragFrom.current = { x: e.pageX, y: e.pageY };
      startDragging();
    },
    [value, startDragging],
  );

  return (
    <div className="w-full flex items-center border">
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
        <div className="w-4 h-8 bg-gray-300 cursor-col-resize rounded-r" onMouseDown={handleDownSlider} />
      ) : undefined}
    </div>
  );
};
