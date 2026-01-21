import { newExtrudingLineSegmentState } from "./lines/extrudingLineSegment";
import { newLineCombineState } from "./lines/lineCombineState";
import { newLineDrawingState } from "./lines/lineDrawingState";
import { newLineNormalReadyState } from "./lines/lineNormalReadyState";
import { newLineReadyState } from "./lines/lineReadyState";
import { newLineSegmentEditingState } from "./lines/lineSegmentEditingState";
import { newLineTangentReadyState } from "./lines/lineTangentReadyState";
import { newMovingAnchorOnLineState } from "./lines/movingAnchorOnLineState";
import { newMovingLineSegmentState } from "./lines/movingLineSegmentState";
import { newMovingOnLineState } from "./lines/movingOnLineState";
import { newVertexAttachingState } from "./lines/vertexAttachingState";
import { newMovingHubState } from "./movingHubState";
import { newMovingShapeState } from "./movingShapeState";
import { newPanToShapeState } from "./panToShapeState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { newRectangleSelectingState } from "./rectangleSelectingState";
import { newSelectionHubState } from "./selectionHubState";
import { newSelectedByPointerOnState } from "./selectedByPointerOnState";
import { newSmartBranchChildMarginState } from "./smartBranch/smartBranchChildMarginState";
import { newSmartBranchPointerDownState } from "./smartBranch/smartBranchPointerDownState";
import { newSmartBranchSettingState } from "./smartBranch/smartBranchSettingState";
import { newSmartBranchSiblingMarginState } from "./smartBranch/smartBranchSiblingMarginState";
import { newVnCreatePolygonState } from "./vectorNetworks/vnCreatePolygonState";
import { newVnEdgeDrawingState } from "./vectorNetworks/vnEdgeDrawingState";
import { newVnNodeInsertReadyState } from "./vectorNetworks/vnNodeInsertReadyState";
import { newVNNodeSelectedState } from "./vectorNetworks/vnNodeSelectedState";
import { newShapeAttachingState } from "./attachments/shapeAttachingState";
import { newMovingShapeInTableState } from "./table/movingShapeInTableState";
import { newMovingShapeInAlignState } from "./align/movingShapeInAlignState";

// TODO: Should hoist all states here to avoid circular dependencies.
export const stateGenerators = {
  newSelectionHubState,
  newRectangleSelectingState,
  newMovingHubState,
  newMovingShapeState,
  newMovingOnLineState,
  newMovingAnchorOnLineState,
  newLineReadyState,
  newLineDrawingState,
  newLineTangentReadyState,
  newLineNormalReadyState,
  newVertexAttachingState,
  newLineCombineState,
  newMovingLineSegmentState,
  newExtrudingLineSegmentState,
  newLineSegmentEditingState,
  newPointerDownEmptyState,
  newSelectedByPointerOnState,
  newPanToShapeState,
  newSmartBranchPointerDownState,
  newSmartBranchSettingState,
  newSmartBranchChildMarginState,
  newSmartBranchSiblingMarginState,
  newVNNodeSelectedState,
  newVnEdgeDrawingState,
  newVnNodeInsertReadyState,
  newVnCreatePolygonState,
  newShapeAttachingState,
  newMovingShapeInTableState,
  newMovingShapeInAlignState,
};
export type StateGenerators = typeof stateGenerators;
