import { newLineDrawingState } from "./lines/lineDrawingState";
import { newLineNormalReadyState } from "./lines/lineNormalReadyState";
import { newLineReadyState } from "./lines/lineReadyState";
import { newLineSegmentEditingState } from "./lines/lineSegmentEditingState";
import { newLineTangentReadyState } from "./lines/lineTangentReadyState";
import { newMovingAnchorOnLineState } from "./lines/movingAnchorOnLineState";
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
  newLineSegmentEditingState,
  newPointerDownEmptyState,
  newPanToShapeState,
  newSmartBranchPointerDownState,
  newSmartBranchSettingState,
  newSmartBranchChildMarginState,
  newSmartBranchSiblingMarginState,
};
export type StateGenerators = typeof stateGenerators;
