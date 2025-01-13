import { isFrameShape } from "../shapes/frame";
import { getIntRectFromFloatRect } from "../utils/geometry";
import { getRootShapeIdsByFrame } from "./frame";
import { getAllShapeRangeWithinComposite, newShapeComposite, ShapeComposite } from "./shapeComposite";

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

export function getExportParamsForSelectedShapes(shapeComposite: ShapeComposite, targetIds: string[]) {
  // Get optimal exporting range for selected shapes.
  // This range may differ from visually selected range due to the optimization.
  const selectedShapeComposite = shapeComposite.getSubShapeComposite(targetIds);
  const range = getIntRectFromFloatRect(getAllShapeRangeWithinComposite(selectedShapeComposite, true));

  // Get source shapes regarding frame shapes.
  // Shapes sticking out frames can be cut off since the range is based on directly selected shapes.
  const sourceIdSet = new Set(targetIds);
  targetIds.forEach((id) => {
    const s = shapeComposite.shapeMap[id];
    if (isFrameShape(s)) {
      getRootShapeIdsByFrame(shapeComposite, s).forEach((idInFrame) => sourceIdSet.add(idInFrame));
    }
  });
  const targetShapeComposite = shapeComposite.getSubShapeComposite(Array.from(sourceIdSet));

  return { targetShapeComposite, range };
}

export function getExportParamsForSelectedRange(shapeComposite: ShapeComposite, targetIds: string[]) {
  const srcShapes = shapeComposite.getAllBranchMergedShapes(targetIds);
  // Get currently selected range.
  // Unlike "getExportParamsForSelectedShapes", this function prioritizes visually selected range.
  const range = getIntRectFromFloatRect(shapeComposite.getWrapperRectForShapes(srcShapes, true));
  const targetShapes = shapeComposite.getShapesOverlappingRect(shapeComposite.shapes, range);
  const targetShapeComposite = newShapeComposite({ shapes: targetShapes, getStruct: shapeComposite.getShapeStruct });
  return { targetShapeComposite, range };
}
