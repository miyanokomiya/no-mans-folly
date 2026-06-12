import { Shape } from "../../../../models";
import { LineShape } from "../../../../shapes/line";
import { patchPipe } from "../../../../utils/commons";
import { PreserveAttachmentHandler } from "../../../lineAttachmentHandler";
import { getNextShapeComposite, ShapeComposite } from "../../../shapeComposite";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";

export function getPatchAfterLayoutsWithPreserveAttachment(
  shapeComposite: ShapeComposite,
  preserveAttachmentHandler: PreserveAttachmentHandler,
  lineId: string,
  linePatch: Partial<LineShape>,
): { [id: string]: Partial<Shape> } {
  const preservedPatch = preserveAttachmentHandler.getPatch(linePatch);
  if (!preservedPatch) return getPatchAfterLayouts(shapeComposite, { update: { [lineId]: linePatch } });

  return patchPipe(
    [
      // Apply the patch to preserve attachments
      () => preservedPatch,
      // Then, apply layout logics
      (_, current) => {
        const preservedSC = getNextShapeComposite(shapeComposite, { update: current });
        return getPatchAfterLayouts(preservedSC, { update: { [lineId]: linePatch } });
      },
    ],
    {},
  ).patch;
}
