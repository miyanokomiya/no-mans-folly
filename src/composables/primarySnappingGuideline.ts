import { add, getPedal, getRadian, IVec2, sub } from "okageo";
import { ISegment } from "../utils/geometry";
import { getIndexGuidelineFromSnappingResult, getSecondGuidelineCandidateInfo, SnappingResult } from "./shapeSnapping";
import { COMMAND_EXAM_SRC } from "./states/appCanvas/commandExams";
import { CommandExam } from "./states/types";

export function newPrimarySnappingGuidelineHandler() {
  // line: Primary guideline
  // padding: Padding from the pedal of the line to the moving source point.
  // => the moving source point should move along "line" with "padding"
  let primaryGuidelineInfo: [line: ISegment, padding: IVec2] | undefined;

  function getPrimaryInfo() {
    return primaryGuidelineInfo;
  }

  function getGuidelineRadian(): number | undefined {
    return primaryGuidelineInfo ? getRadian(primaryGuidelineInfo[0][1], primaryGuidelineInfo[0][0]) : undefined;
  }

  function clear() {
    primaryGuidelineInfo = undefined;
  }

  function update(snappingResult: SnappingResult | undefined, movedP: IVec2) {
    if (!snappingResult) {
      primaryGuidelineInfo = undefined;
      return;
    }

    const indexGuideline = primaryGuidelineInfo
      ? // Try to pick other angled guideline than current one
        getIndexGuidelineFromSnappingResult(
          getSecondGuidelineCandidateInfo(snappingResult, sub(primaryGuidelineInfo[0][1], primaryGuidelineInfo[0][0])),
        )
      : getIndexGuidelineFromSnappingResult(snappingResult);
    if (indexGuideline) {
      primaryGuidelineInfo = [indexGuideline.line, sub(movedP, getPedal(movedP, indexGuideline.line))];
    } else {
      primaryGuidelineInfo = undefined;
    }
  }

  function getDiff(movingSrcP: IVec2, srcD: IVec2): IVec2 {
    if (!primaryGuidelineInfo) return srcD;

    const adjustedMovedRectP = add(getPedal(add(movingSrcP, srcD), primaryGuidelineInfo[0]), primaryGuidelineInfo[1]);
    return sub(adjustedMovedRectP, movingSrcP);
  }

  function getCommands(): CommandExam[] {
    return primaryGuidelineInfo
      ? [COMMAND_EXAM_SRC.SWITCH_PRIMARY_GUIDE, COMMAND_EXAM_SRC.CLEAR_PRIMARY_GUIDE]
      : [COMMAND_EXAM_SRC.PICK_PRIMARY_GUIDE];
  }

  return { getPrimaryInfo, getGuidelineRadian, clear, update, getDiff, getCommands };
}
