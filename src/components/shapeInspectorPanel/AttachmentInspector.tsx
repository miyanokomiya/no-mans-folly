import { useCallback } from "react";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { InlineField } from "../atoms/InlineField";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { Shape, ShapeAttachment } from "../../models";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { BlockField } from "../atoms/BlockField";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { normalizeRadian } from "../../utils/geometry";

interface Props {
  targetShape: Shape;
  targetTmpShape: Shape;
  updateAttachment: (patch: Partial<ShapeAttachment>, draft?: boolean) => void;
  readyState: () => void;
  commit: () => void;
}

export const AttachmentInspector: React.FC<Props> = ({
  targetShape,
  targetTmpShape,
  updateAttachment,
  readyState,
  commit,
}) => {
  const attachment = targetShape.attachment;
  const tmpAttachment = targetTmpShape.attachment;

  const updateAttchment = useCallback(
    (val: Partial<ShapeAttachment>, draft = false) => {
      if (draft) {
        readyState();
        updateAttachment(val, true);
      } else {
        commit();
      }
    },
    [updateAttachment, readyState, commit],
  );

  const handleAnchorRateChange = useCallback(
    (val: number, draft = false) => {
      if (!attachment) return;
      updateAttchment({ to: { x: val, y: attachment.to.y } }, draft);
    },
    [attachment, updateAttchment],
  );

  const handleRelativeRotationChange = useCallback(
    (val: boolean) => {
      if (!attachment) return;
      updateAttachment({ rotationType: val ? "relative" : "absolute", rotation: 0 });
    },
    [attachment, updateAttachment],
  );
  const handleRotationChange = useCallback(
    (val: number, draft = false) => {
      if (!attachment) return;
      updateAttchment({ rotation: normalizeRadian((val * Math.PI) / 180) }, draft);
    },
    [attachment, updateAttchment],
  );
  const handleRotationCommit = useCallback(() => {
    if (!tmpAttachment) return;
    updateAttchment(tmpAttachment);
  }, [tmpAttachment, updateAttchment]);

  const handleAnchorXChange = useCallback(
    (val: number, draft = false) => {
      if (!attachment) return;
      updateAttchment({ anchor: { x: val, y: attachment.anchor.y } }, draft);
    },
    [attachment, updateAttchment],
  );
  const handleAnchorYChange = useCallback(
    (val: number, draft = false) => {
      if (!attachment) return;
      updateAttchment({ anchor: { x: attachment.anchor.x, y: val } }, draft);
    },
    [attachment, updateAttchment],
  );

  if (!attachment || !tmpAttachment) return;

  return (
    <BlockGroupField label="Attachment" accordionKey="attachment-inspector">
      <InlineField label="Rate" fullBody>
        <SliderInput
          value={tmpAttachment.to.x}
          onChanged={handleAnchorRateChange}
          min={0}
          max={1}
          step={0.01}
          showValue
        />
      </InlineField>
      <BlockGroupField label="Rotation">
        <InlineField label="Relative">
          <ToggleInput value={tmpAttachment.rotationType === "relative"} onChange={handleRelativeRotationChange} />
        </InlineField>
        {tmpAttachment.rotationType === "relative" ? (
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
            value={tmpAttachment.anchor.x}
            onChanged={handleAnchorXChange}
            min={0}
            max={1}
            step={0.01}
            showValue
          />
        </InlineField>
        <InlineField label="Top" fullBody>
          <SliderInput
            value={tmpAttachment.anchor.y}
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
