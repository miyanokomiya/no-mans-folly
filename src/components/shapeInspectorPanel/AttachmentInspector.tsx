import { useCallback } from "react";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { InlineField } from "../atoms/InlineField";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { Shape } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { BlockField } from "../atoms/BlockField";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { normalizeRadian } from "../../utils/geometry";

interface Props {
  targetShape: Shape;
  targetTmpShape: Shape;
  updateTargetShape: (patch: Partial<Shape>, draft?: boolean) => void;
  readyState: () => void;
  commit: () => void;
}

export const AttachmentInspector: React.FC<Props> = ({
  targetShape,
  targetTmpShape,
  updateTargetShape,
  readyState,
  commit,
}) => {
  const attachment = targetShape.attachment;
  const tmpAttachment = targetTmpShape.attachment;

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
      updateTargetShape({ attachment: { ...attachment, rotationType: val ? "relative" : "absolute", rotation: 0 } });
    },
    [attachment, updateTargetShape],
  );
  const handleRotationChange = useCallback(
    (val: number, draft = false) => {
      if (!attachment) return;
      if (draft) {
        readyState();
        updateTargetShape({ attachment: { ...attachment, rotation: normalizeRadian((val * Math.PI) / 180) } }, true);
      } else {
        commit();
      }
    },
    [attachment, updateTargetShape, readyState, commit],
  );
  const handleRotationCommit = useCallback(() => {
    if (!attachment) return;
    commit();
  }, [attachment, commit]);

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

  if (!attachment || !tmpAttachment) return;

  return (
    <BlockGroupField label="Attachment" accordionKey="attachment-inspector">
      <InlineField label="Rate" fullBody>
        <SliderInput value={attachment.to.x} onChanged={handleAnchorRateChange} min={0} max={1} step={0.01} showValue />
      </InlineField>
      <BlockGroupField label="Rotation">
        <InlineField label="Relative">
          <ToggleInput value={attachment.rotationType === "relative"} onChange={handleRelativeRotationChange} />
        </InlineField>
        {attachment.rotationType === "relative" ? (
          <InlineField label="Angle">
            <div className="w-24">
              <NumberInput
                value={(tmpAttachment.rotation * 180) / Math.PI}
                onChange={handleRotationChange}
                onBlur={handleRotationCommit}
                keepFocus
                slider
              />
            </div>
          </InlineField>
        ) : undefined}
      </BlockGroupField>
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
