import { newLineNormalReadyState } from "./lines/lineNormalReadyState";
import { newLineReadyState } from "./lines/lineReadyState";
import { newLineTangentReadyState } from "./lines/lineTangentReadyState";
import { newMovingAnchorOnLineState } from "./lines/movingAnchorOnLineState";
import { newMovingOnLineState } from "./lines/movingOnLineState";
import { newMovingHubState } from "./movingHubState";
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
};
export type StateGenerators = typeof stateGenerators;
