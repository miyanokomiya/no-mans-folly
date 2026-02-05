import { getDistanceSq } from "okageo";
import { EditMovement } from "./states/types";

const FUZZY_DURATION = 100;
const FUZZY_DISTANCE = 8;
const FUZZY_CLICK_DURATION = 200;

type FuzzyDragOption = {
  fuzzyDuration?: number;
  fuzzyDistance?: number;
  fuzzyClickDuration?: number;
};

export function newFuzzyDrag(option?: FuzzyDragOption) {
  const fuzzyDuration = option?.fuzzyDuration ?? FUZZY_DURATION;
  const fuzzyDistance = option?.fuzzyDistance ?? FUZZY_DISTANCE;
  const fuzzyClickDuration = option?.fuzzyClickDuration ?? FUZZY_CLICK_DURATION;
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
    /**
     * Returns true when this action can be regarded as click
     */
    onUp: (timestamp: number): boolean => {
      const ret = !dragging && timestamp - timestampOnDown < fuzzyClickDuration;
      timestampOnDown = 0;
      dragging = false;
      return ret;
    },
    isDragging: () => dragging,
    getTimestampOnDown: () => timestampOnDown,
  };
}
export type FuzzyDrag = ReturnType<typeof newFuzzyDrag>;
