import { IVec2 } from "okageo";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { useCallback, useRef } from "react";
import iconSwap from "../../assets/icons/swap.svg";

interface Props {
  value: IVec2;
  onChange?: (val: IVec2, draft?: boolean) => void;
  max?: number;
  min?: number;
  disabled?: boolean;
  disabledX?: boolean;
  disabledY?: boolean;
  swappable?: boolean;
}

export const PointField: React.FC<Props> = ({
  value,
  onChange,
  min,
  max,
  disabled,
  disabledX,
  disabledY,
  swappable,
}) => {
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

  const handleSwap = useCallback(() => {
    onChange?.({ x: latestValue.current.y, y: latestValue.current.x });
  }, [onChange]);

  const fieldClassName = swappable ? "w-21" : "w-24";
  return (
    <div className={"flex items-center" + (swappable ? " gap-1" : " gap-2")}>
      <div className={fieldClassName}>
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
      {swappable ? (
        <button type="button" className="rounded-xs p-0.5 border hover:bg-gray-200 w-6 h-6" onClick={handleSwap}>
          <img src={iconSwap} alt="Swap" className="w-full h-full" />
        </button>
      ) : undefined}
      <div className={fieldClassName}>
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
