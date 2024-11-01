import { newMovingHubState } from "./movingHubState";
import { newSelectionHubState } from "./selectionHubState";

// TODO: Should hoist all states here to avoid circular dependencies.
export const stateGenerators = {
  newSelectionHubState,
  newMovingHubState,
};
export type StateGenerators = typeof stateGenerators;
