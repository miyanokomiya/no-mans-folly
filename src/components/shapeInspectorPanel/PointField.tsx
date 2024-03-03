import { IVec2 } from "okageo";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { useCallback, useRef } from "react";

interface Props {
  value: IVec2;
  onChange?: (val: IVec2, draft?: boolean) => void;
}

export const PointField: React.FC<Props> = ({ value, onChange }) => {
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
      <span>(</span>
      <div className="w-20">
        <NumberInput value={value.x} onChange={handleChangeX} onBlur={commit} keepFocus slider />
      </div>
      <span>,</span>
      <div className="w-20">
        <NumberInput value={value.y} onChange={handleChangeY} onBlur={commit} keepFocus slider />
      </div>
      <span>)</span>
    </div>
  );
};
