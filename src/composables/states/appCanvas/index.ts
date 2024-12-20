import { newLineNormalReadyState } from "./lines/lineNormalReadyState";
import { newLineReadyState } from "./lines/lineReadyState";
import { newLineTangentReadyState } from "./lines/lineTangentReadyState";
import { newMovingAnchorOnLineState } from "./lines/movingAnchorOnLineState";
import { newMovingOnLineState } from "./lines/movingOnLineState";
import { newVertexAttachingState } from "./lines/vertexAttachingState";
import { newMovingHubState } from "./movingHubState";
import { newPointerDownEmptyState } from "./pointerDownEmptyState";
import { newSelectionHubState } from "./selectionHubState";

// TODO: Should hoist all states here to avoid circular dependencies.
export const stateGenerators = {
  newSelectionHubState,
  newMovingHubState,
  newMovingOnLineState,
  newMovingAnchorOnLineState,
  newLineReadyState,
  newLineTangentReadyState,
  newLineNormalReadyState,
  newVertexAttachingState,
  newPointerDownEmptyState,
};
export type StateGenerators = typeof stateGenerators;
