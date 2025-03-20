import { getDistanceSq } from "okageo";
import { EditMovement } from "./states/types";

const FUZZY_DURATION = 100;
const FUZZY_DISTANCE = 8;

type FuzzyDragOption = {
  fuzzyDuration?: number;
  fuzzyDistance?: number;
};

export function newFuzzyDrag(option?: FuzzyDragOption) {
  const fuzzyDuration = option?.fuzzyDuration ?? FUZZY_DURATION;
  const fuzzyDistance = option?.fuzzyDistance ?? FUZZY_DISTANCE;
  let timestampOnDown = 0;
  let dragging = false;

  return {
    onDown: (timestamp: number) => {
      timestampOnDown = timestamp;
      dragging = false;
    },
    onMove: (timestamp: number, movement: EditMovement) => {
      if (
        timestamp - timestampOnDown < fuzzyDuration &&
        getDistanceSq(movement.current, movement.startAbs) < Math.pow(fuzzyDistance * movement.scale, 2)
      )
        return;

      dragging = true;
    },
    onUp: () => {
      timestampOnDown = 0;
      dragging = false;
    },
    isDragging: () => dragging,
    getTimestampOnDown: () => timestampOnDown,
  };
}
export type FuzzyDrag = ReturnType<typeof newFuzzyDrag>;
