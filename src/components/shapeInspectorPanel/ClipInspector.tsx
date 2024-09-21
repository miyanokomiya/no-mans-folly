import { useCallback } from "react";
import { ClipRule, Shape } from "../../models";
import { BlockGroupField } from "../atoms/BlockField";
import iconClipIn from "../../assets/icons/clip_rule_in.svg";
import iconClipOut from "../../assets/icons/clip_rule_out.svg";
import { GroupShape, isGroupShape } from "../../shapes/group";
import { InlineField } from "../atoms/InlineField";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

const rules: { value: ClipRule; icon: string }[] = [
  { value: "out", icon: iconClipOut },
  { value: "in", icon: iconClipIn },
];

interface Props {
  targetShape: Shape;
  updateTargetShape: (patch: Partial<Shape>) => void;
  updateTargetGroupShape: (patch: Partial<GroupShape>) => void;
}

export const ClipInspector: React.FC<Props> = ({ targetShape, updateTargetShape, updateTargetGroupShape }) => {
  const handleClipRuleChange = useCallback(
    (val: ClipRule) => {
      updateTargetGroupShape({ clipRule: val });
    },
    [updateTargetGroupShape],
  );

  const handleClippingChange = useCallback(
    (val: boolean) => {
      updateTargetShape({ clipping: val });
    },
    [updateTargetShape],
  );

  return (
    <BlockGroupField label="Clip">
      <InlineField label="Clip within parent group">
        <ToggleInput value={targetShape.clipping} onChange={handleClippingChange} />
      </InlineField>
      {isGroupShape(targetShape) ? (
        <InlineField label="Clip mode" inert={targetShape.clipping}>
          <div className="flex flex-wrap justify-end gap-1">
            {rules.map((rule) => (
              <ItemButton
                key={rule.value}
                value={rule.value}
                icon={rule.icon}
                selectedValue={targetShape.clipRule}
                onClick={handleClipRuleChange}
              />
            ))}
          </div>
        </InlineField>
      ) : undefined}
    </BlockGroupField>
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
