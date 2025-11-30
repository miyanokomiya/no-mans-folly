import { isFrameShape } from "../shapes/frame";
import { isFrameAlignGroupShape } from "../shapes/frameGroups/frameAlignGroup";
import { getIntRectFromFloatRect } from "../utils/geometry";
import { getRootShapeIdsByFrame, getRootShapeIdsByFrameGroup } from "./frame";
import { getAllShapeRangeWithinComposite, ShapeComposite } from "./shapeComposite";

export function escapeFilename(src: string): string {
  return src.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

/**
 * Make sure "filename" is already valid.
 */
export function saveFileInWeb(file: string, filename: string) {
  const a = document.createElement("a");
  a.href = file;
  a.download = filename;
  a.style.display = "none";
  a.click();
}

export function getExportParamsForSelectedShapes(
  shapeComposite: ShapeComposite,
  targetIds: string[],
  withMeta = false,
) {
  // Get source shapes regarding frame shapes.
  const sourceIdSet = new Set(targetIds);
  targetIds.forEach((id) => {
    const s = shapeComposite.shapeMap[id];
    if (isFrameShape(s)) {
      getRootShapeIdsByFrame(shapeComposite, s).forEach((idInFrame) => sourceIdSet.add(idInFrame));
    } else if (isFrameAlignGroupShape(s)) {
      getRootShapeIdsByFrameGroup(shapeComposite, s).forEach((idInFrameGroup) => sourceIdSet.add(idInFrameGroup));
    }
  });

  // Get target shapes regarding "noExport" property for deriving the range.
  const targetShapeCompositeRegardNoExport = shapeComposite.getSubShapeComposite(
    omitNoExportShapeIds(shapeComposite, Array.from(sourceIdSet)),
  );

  // Get target range based on target shapes.
  // Shapes sticking out frames can be cut off since the range is based on directly selected shapes.
  const rangeShapeComposite = shapeComposite.getSubShapeComposite(omitNoExportShapeIds(shapeComposite, targetIds));
  const range = getIntRectFromFloatRect(getAllShapeRangeWithinComposite(rangeShapeComposite, true));

  // Ignore "noExport" property when meta info is required.
  const targetShapeComposite = withMeta
    ? shapeComposite.getSubShapeComposite(Array.from(sourceIdSet))
    : targetShapeCompositeRegardNoExport;
  return { targetShapeComposite, range };
}

export function getExportParamsForSelectedRange(
  shapeComposite: ShapeComposite,
  targetIds: string[],
  excludeIdSet?: Set<string>,
  withMeta = false,
) {
  const srcShapes = shapeComposite.getAllBranchMergedShapes(targetIds);
  // Get currently selected range.
  // Unlike "getExportParamsForSelectedShapes", this function prioritizes visually selected range.
  // => Even if target shapes have "noExport" property, their bounds affect the range.
  const range = getIntRectFromFloatRect(shapeComposite.getWrapperRectForShapes(srcShapes, true));
  const targetShapes = shapeComposite
    .getShapesOverlappingRect(shapeComposite.shapes, range)
    .filter((s) => !excludeIdSet?.has(s.id));
  const targetShapeComposite = shapeComposite.getSubShapeComposite(
    withMeta
      ? targetShapes.map((s) => s.id)
      : omitNoExportShapeIds(
          shapeComposite,
          targetShapes.map((s) => s.id),
        ),
  );
  return { targetShapeComposite, range };
}

function omitNoExportShapeIds(shapeComposite: ShapeComposite, ids: string[]): string[] {
  const noExportIds = ids.filter((id) => {
    const s = shapeComposite.shapeMap[id];
    return !!s.noExport;
  });
  const noExportAllIdSet = new Set(shapeComposite.getAllBranchMergedShapes(noExportIds).map((s) => s.id));
  return ids.filter((id) => !noExportAllIdSet.has(id));
}
