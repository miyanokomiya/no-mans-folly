import { useCallback } from "react";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { InlineField } from "../atoms/InlineField";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { Shape } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { BlockField } from "../atoms/BlockField";

interface Props {
  targetShape: Shape;
  updateTargetShape: (patch: Partial<Shape>) => void;
}

export const AttachmentInspector: React.FC<Props> = ({ targetShape, updateTargetShape }) => {
  const attachment = targetShape.attachment;

  const handleAnchorRateChange = useCallback(
    (val: number) => {
      if (!attachment) return;
      updateTargetShape({ attachment: { ...attachment, to: { x: val, y: attachment.to.y } } });
    },
    [attachment, updateTargetShape],
  );

  const handleRelativeRotationChange = useCallback(
    (val: boolean) => {
      if (!attachment) return;
      updateTargetShape({ attachment: { ...attachment, rotationType: val ? "relative" : "absolute" } });
    },
    [attachment, updateTargetShape],
  );

  const handleAnchorXChange = useCallback(
    (val: number) => {
      if (!attachment) return;
      updateTargetShape({ attachment: { ...attachment, anchor: { x: val, y: attachment.anchor.y } } });
    },
    [attachment, updateTargetShape],
  );
  const handleAnchorYChange = useCallback(
    (val: number) => {
      if (!attachment) return;
      updateTargetShape({ attachment: { ...attachment, anchor: { x: attachment.anchor.x, y: val } } });
    },
    [attachment, updateTargetShape],
  );

  if (!attachment) return;

  return (
    <BlockGroupField label="Attachment" accordionKey="attachment-inspector">
      <InlineField label="Rate" fullBody>
        <SliderInput value={attachment.to.x} onChanged={handleAnchorRateChange} min={0} max={1} step={0.01} showValue />
      </InlineField>
      <InlineField label="Relative rotation">
        <ToggleInput value={attachment.rotationType === "relative"} onChange={handleRelativeRotationChange} />
      </InlineField>
      <BlockField label="Anchor" fullBody>
        <InlineField label="Left" fullBody>
          <SliderInput
            value={attachment.anchor.x}
            onChanged={handleAnchorXChange}
            min={0}
            max={1}
            step={0.01}
            showValue
          />
        </InlineField>
        <InlineField label="Top" fullBody>
          <SliderInput
            value={attachment.anchor.y}
            onChanged={handleAnchorYChange}
            min={0}
            max={1}
            step={0.01}
            showValue
          />
        </InlineField>
      </BlockField>
    </BlockGroupField>
  );
};
