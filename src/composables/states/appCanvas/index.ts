import { newExtrudingLineSegmentState } from "./lines/extrudingLineSegment";
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
import { newSelectionHubState } from "./selectionHubState";
import { newSmartBranchChildMarginState } from "./smartBranch/smartBranchChildMarginState";
import { newSmartBranchPointerDownState } from "./smartBranch/smartBranchPointerDownState";
import { newSmartBranchSettingState } from "./smartBranch/smartBranchSettingState";
import { newSmartBranchSiblingMarginState } from "./smartBranch/smartBranchSiblingMarginState";
import { newVnCreatePolygonState } from "./vectorNetworks/vnCreatePolygonState";
import { newVnEdgeDrawingState } from "./vectorNetworks/vnEdgeDrawingState";
import { newVnNodeInsertReadyState } from "./vectorNetworks/vnNodeInsertReadyState";
import { newVNNodeSelectedState } from "./vectorNetworks/vnNodeSelectedState";

// TODO: Should hoist all states here to avoid circular dependencies.
export const stateGenerators = {
  newSelectionHubState,
  newMovingHubState,
  newMovingShapeState,
  newMovingOnLineState,
  newMovingAnchorOnLineState,
  newLineReadyState,
  newLineDrawingState,
  newLineTangentReadyState,
  newLineNormalReadyState,
  newVertexAttachingState,
  newMovingLineSegmentState,
  newExtrudingLineSegmentState,
  newLineSegmentEditingState,
  newPointerDownEmptyState,
  newPanToShapeState,
  newSmartBranchPointerDownState,
  newSmartBranchSettingState,
  newSmartBranchChildMarginState,
  newSmartBranchSiblingMarginState,
  newVNNodeSelectedState,
  newVnEdgeDrawingState,
  newVnNodeInsertReadyState,
  newVnCreatePolygonState,
};
export type StateGenerators = typeof stateGenerators;
