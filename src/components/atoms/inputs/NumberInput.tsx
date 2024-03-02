import { useCallback, useEffect, useRef, useState } from "react";
import { useDraggable } from "../../../hooks/draggable";

interface Props {
  value: number;
  onChange?: (val: number) => void;
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

      onChange?.(parseFloat(v));
    },
    [onChange],
  );

  const { startDrag, v: dragV } = useDraggable();
  const [startValue, setStartValue] = useState(value);

  const handleDownSlider = useCallback(
    (e: React.MouseEvent) => {
      setStartValue(value);
      startDrag(e);
    },
    [value, startDrag],
  );

  useEffect(() => {
    if (!dragV) return;

    const next = Math.round(startValue + dragV.x);
    onChange?.(next);
  }, [dragV, startValue, onChange]);

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
