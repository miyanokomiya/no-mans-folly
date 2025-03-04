import { IVec2 } from "okageo";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { useCallback, useRef } from "react";

interface Props {
  value: IVec2;
  onChange?: (val: IVec2, draft?: boolean) => void;
  max?: number;
  min?: number;
  disabled?: boolean;
  disabledX?: boolean;
  disabledY?: boolean;
}

export const PointField: React.FC<Props> = ({ value, onChange, min, max, disabled, disabledX, disabledY }) => {
  const latestValue = useRef(value);
  latestValue.current = value;

  const commit = useCallback(() => {
    onChange?.(latestValue.current);
  }, [onChange]);

  const handleChangeX = useCallback(
    (val: number, draft = false) => {
      onChange?.({ x: val, y: latestValue.current.y }, draft);
    },
    [onChange],
  );

  const handleChangeY = useCallback(
    (val: number, draft = false) => {
      onChange?.({ x: latestValue.current.x, y: val }, draft);
    },
    [onChange],
  );

  return (
    <div className="flex items-center gap-2">
      <div className="w-24">
        <NumberInput
          value={value.x}
          onChange={handleChangeX}
          onBlur={commit}
          min={min}
          max={max}
          disabled={disabled || disabledX}
          keepFocus
          slider
        />
      </div>
      <div className="w-24">
        <NumberInput
          value={value.y}
          onChange={handleChangeY}
          onBlur={commit}
          min={min}
          max={max}
          disabled={disabled || disabledY}
          keepFocus
          slider
        />
      </div>
    </div>
  );
};
