import { useCallback } from "react";
import { ClipRule } from "../../models";
import { BlockField } from "../atoms/BlockField";
import iconClipIn from "../../assets/icons/clip_rule_in.svg";
import iconClipOut from "../../assets/icons/clip_rule_out.svg";
import { GroupShape } from "../../shapes/group";

const rules: { value: ClipRule; icon: string }[] = [
  { value: "out", icon: iconClipOut },
  { value: "in", icon: iconClipIn },
];

interface Props {
  targetShape: GroupShape;
  updateTargetShape: (patch: Partial<GroupShape>) => void;
}

export const ClipRuleInspector: React.FC<Props> = ({ targetShape, updateTargetShape }) => {
  const handleChange = useCallback(
    (val: ClipRule) => {
      updateTargetShape({ clipRule: val });
    },
    [updateTargetShape],
  );

  return (
    <BlockField label="Clip rule">
      <div className="w-56 flex flex-wrap justify-end gap-1">
        {rules.map((rule) => (
          <ItemButton
            key={rule.value}
            value={rule.value}
            icon={rule.icon}
            selectedValue={targetShape.clipRule}
            onClick={handleChange}
          />
        ))}
      </div>
    </BlockField>
  );
};

interface ItemButtonProps {
  value: ClipRule;
  icon: string;
  selectedValue?: ClipRule;
  onClick?: (val: ClipRule) => void;
}

const ItemButton: React.FC<ItemButtonProps> = ({ value, icon, selectedValue, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(value);
  }, [value, onClick]);

  const highlightClassName = value === (selectedValue ?? 0) ? " border-cyan-400" : " border-white";

  return (
    <button type="button" onClick={handleClick} className={"w-12 h-12 border-2" + highlightClassName}>
      <img src={icon} alt={value} />
    </button>
  );
};
