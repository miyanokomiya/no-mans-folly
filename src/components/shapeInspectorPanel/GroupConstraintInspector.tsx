import { useCallback } from "react";
import { GroupConstraint, Shape } from "../../models";
import { BlockField, BlockGroupField } from "../atoms/BlockField";
import gcIcon0 from "../../assets/icons/group_constraints_0.svg";
import gcIcon1 from "../../assets/icons/group_constraints_1.svg";
import gcIcon2 from "../../assets/icons/group_constraints_2.svg";
import gcIcon3 from "../../assets/icons/group_constraints_3.svg";
import gcIcon4 from "../../assets/icons/group_constraints_4.svg";
import gcIcon5 from "../../assets/icons/group_constraints_5.svg";
import gcIcon6 from "../../assets/icons/group_constraints_6.svg";

const gcIcons = [gcIcon0, gcIcon1, gcIcon2, gcIcon3, gcIcon4, gcIcon5, gcIcon6];
const gcVAlts = ["None", "Top", "Height", "Bottom", "Top & Height", "Top & Bottom", "Height & Bottom"];
const gcHAlts = ["None", "Left", "Width", "Right", "Left & Width", "Left & Right", "Width & Right"];

interface Props {
  targetShape: Shape;
  updateTargetShape: (patch: Partial<Shape>) => void;
}

export const GroupConstraintInspector: React.FC<Props> = ({ targetShape, updateTargetShape }) => {
  const handleGcVChange = useCallback(
    (val: GroupConstraint) => {
      updateTargetShape({ gcV: val });
    },
    [updateTargetShape],
  );

  const handleGcHChange = useCallback(
    (val: GroupConstraint) => {
      updateTargetShape({ gcH: val });
    },
    [updateTargetShape],
  );

  return (
    <BlockGroupField label="Group constraints">
      <BlockField label="Vertical fixed">
        <div className="w-56 flex flex-wrap justify-end gap-1">
          {gcIcons.map((icon, i) => (
            <ItemButton
              key={icon}
              value={i as any}
              icon={icon}
              selectedValue={targetShape.gcV}
              vertical
              onClick={handleGcVChange}
            />
          ))}
        </div>
      </BlockField>
      <BlockField label="Horinzontal fixed">
        <div className="w-56 flex flex-wrap justify-end gap-1">
          {gcIcons.map((icon, i) => (
            <ItemButton
              key={icon}
              value={i as any}
              icon={icon}
              selectedValue={targetShape.gcH}
              onClick={handleGcHChange}
            />
          ))}
        </div>
      </BlockField>
    </BlockGroupField>
  );
};

interface ItemButtonProps {
  value: GroupConstraint;
  icon: string;
  vertical?: boolean;
  selectedValue?: GroupConstraint;
  onClick?: (val: GroupConstraint) => void;
}

const ItemButton: React.FC<ItemButtonProps> = ({ value, icon, vertical, selectedValue, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(value);
  }, [value, onClick]);

  const alt = (vertical ? gcVAlts : gcHAlts)[value];
  const highlightClassName = value === (selectedValue ?? 0) ? " border-2 border-cyan-400" : "";

  return (
    <button type="button" onClick={handleClick} className={"relative w-12 h-12"}>
      <div className={"absolute inset-0" + highlightClassName} />
      <img src={icon} alt={alt} className={"absolute inset-0" + (vertical ? " rotate-90" : "")} />
    </button>
  );
};
