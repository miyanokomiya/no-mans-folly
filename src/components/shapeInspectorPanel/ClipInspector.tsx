import { useCallback } from "react";
import { Shape } from "../../models";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { InlineField } from "../atoms/InlineField";

interface Props {
  targetShape: Shape;
  updateTargetShape: (patch: Partial<Shape>) => void;
}

export const ClipInspector: React.FC<Props> = ({ targetShape, updateTargetShape }) => {
  const handleChange = useCallback(
    (val: boolean) => {
      updateTargetShape({ clipping: val });
    },
    [updateTargetShape],
  );

  return (
    <InlineField label="Clip within a group">
      <ToggleInput value={targetShape.clipping} onChange={handleChange} />
    </InlineField>
  );
};
