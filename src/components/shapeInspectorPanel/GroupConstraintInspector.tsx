import { useCallback } from "react";
import { GroupConstraint, Shape } from "../../models";
import { SelectInput } from "../atoms/inputs/SelectInput";
import { InlineField } from "../atoms/InlineField";
import { BlockGroupField } from "../atoms/BlockField";

const gcVOptions = [
  { value: "0", label: "none" },
  { value: "1", label: "top" },
  { value: "2", label: "height" },
  { value: "3", label: "bottom" },
  { value: "4", label: "top, height" },
  { value: "5", label: "top, bottom" },
  { value: "6", label: "height, bottom" },
];

const gcHOptions = [
  { value: "0", label: "none" },
  { value: "1", label: "left" },
  { value: "2", label: "width" },
  { value: "3", label: "right" },
  { value: "4", label: "left, width" },
  { value: "5", label: "left, right" },
  { value: "6", label: "width, right" },
];

interface Props {
  targetShape: Shape;
  updateTargetShape: (patch: Partial<Shape>) => void;
}

export const GroupConstraintInspector: React.FC<Props> = ({ targetShape, updateTargetShape }) => {
  const handleGcVChange = useCallback(
    (val: string) => {
      const gcV = parseInt(val) as GroupConstraint;
      updateTargetShape({ gcV });
    },
    [updateTargetShape],
  );

  const handleGcHChange = useCallback(
    (val: string) => {
      const gcH = parseInt(val) as GroupConstraint;
      updateTargetShape({ gcH });
    },
    [updateTargetShape],
  );

  return (
    <BlockGroupField label="Group constraints">
      <InlineField label="Vertical fixed">
        <div className="w-36">
          <SelectInput
            value={(targetShape.gcV ?? 0).toString()}
            options={gcVOptions}
            onChange={handleGcVChange}
            keepFocus
          />
        </div>
      </InlineField>
      <InlineField label="Horizontal fixed">
        <div className="w-36">
          <SelectInput
            value={(targetShape.gcH ?? 0).toString()}
            options={gcHOptions}
            onChange={handleGcHChange}
            keepFocus
          />
        </div>
      </InlineField>
    </BlockGroupField>
  );
};
