import { useCallback } from "react";
import { Shape } from "../../models";
import { InlineField } from "../atoms/InlineField";
import { SliderInput } from "../atoms/inputs/SliderInput";

interface Props {
  targetTmpShape: Shape;
  updateTargetShape: (patch: Partial<Shape>, draft?: boolean) => void;
}

export const AlphaField: React.FC<Props> = ({ targetTmpShape, updateTargetShape }) => {
  const handleChange = useCallback(
    (val: number, draft = false) => {
      updateTargetShape({ alpha: val }, draft);
    },
    [updateTargetShape],
  );

  return (
    <InlineField label="Alpha" fullBody>
      <SliderInput max={1} min={0} step={0.01} showValue value={targetTmpShape.alpha ?? 1} onChanged={handleChange} />
    </InlineField>
  );
};
