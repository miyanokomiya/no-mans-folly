import { useCallback } from "react";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { InlineField } from "../atoms/InlineField";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { Shape } from "../../models";

interface Props {
  targetShape: Shape;
  updateTargetShape: (patch: Partial<Shape>) => void;
}

export const AttachmentInspector: React.FC<Props> = ({ targetShape, updateTargetShape }) => {
  const attachment = targetShape.attachment;

  const handleRelativeRotationChange = useCallback(
    (val: boolean) => {
      if (!attachment) return;
      updateTargetShape({ attachment: { ...attachment, rotationType: val ? "relative" : "absolute" } });
    },
    [attachment, updateTargetShape],
  );

  if (!attachment) return;

  return (
    <BlockGroupField label="Attachment" accordionKey="attachment-inspector">
      <InlineField label="Relative rotation">
        <ToggleInput value={attachment.rotationType === "relative"} onChange={handleRelativeRotationChange} />
      </InlineField>
    </BlockGroupField>
  );
};
