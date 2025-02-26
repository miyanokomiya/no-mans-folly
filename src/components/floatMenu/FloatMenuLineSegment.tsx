import { useCallback, useContext } from "react";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { AppStateMachineContext } from "../../contexts/AppContext";
import { useShapeComposite } from "../../hooks/storeHooks";
import { getLinePath, LineShape } from "../../shapes/line";
import { getDistance, getRadian } from "okageo";
import { normalizeRadian } from "../../utils/geometry";
import { InlineField } from "../atoms/InlineField";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { getSegmentOriginRadian, getTargetSegment } from "../../composables/shapeHandlers/lineSegmentEditingHandler";

interface Props {
  shapeId: string;
  segmentIndex: number;
  originIndex: 0 | 1;
  relativeAngle?: boolean;
}

export const FloatMenuLineSegment: React.FC<Props> = ({ shapeId, segmentIndex, originIndex, relativeAngle }) => {
  const { handleEvent } = useContext(AppStateMachineContext);
  const shapeComposite = useShapeComposite();

  const lineShapeSrc = shapeComposite.shapeMap[shapeId] as LineShape;
  const segmentSrc = getTargetSegment(getLinePath(lineShapeSrc), segmentIndex, originIndex);
  const sizeSrc = getDistance(segmentSrc[0], segmentSrc[1]);
  const radianSrc = getRadian(segmentSrc[1], segmentSrc[0]);

  const lineShapeLatest = shapeComposite.mergedShapeMap[shapeId] as LineShape;
  const verticesLatest = getLinePath(lineShapeLatest);
  const segmentLatest = getTargetSegment(verticesLatest, segmentIndex, originIndex);
  const sizeLatest = getDistance(segmentLatest[0], segmentLatest[1]);
  const radianLatest = getRadian(segmentLatest[1], segmentLatest[0]);
  const originRadianLatest = getSegmentOriginRadian(verticesLatest, segmentIndex, originIndex, relativeAngle);

  const changed = sizeSrc !== sizeLatest || radianSrc !== radianLatest;

  const handleLengthChange = useCallback(
    (val: number) => {
      handleEvent({
        type: "line-segment-change",
        data: { size: val },
      });
    },
    [handleEvent],
  );

  const handleAngleChange = useCallback(
    (val: number) => {
      const radian = (val * Math.PI) / 180 + originRadianLatest;
      handleEvent({
        type: "line-segment-change",
        data: { radian },
      });
    },
    [handleEvent, originRadianLatest],
  );

  const handleRelativeOriginChange = useCallback(
    (val: boolean) => {
      handleEvent({
        type: "line-segment-change",
        data: { relativeAngle: val },
      });
    },
    [handleEvent],
  );

  const handleReset = useCallback(() => {
    handleEvent({
      type: "line-segment-change",
      data: { reset: true },
    });
  }, [handleEvent]);

  return (
    <div className="py-1">
      <div className="mb-1 flex items-center gap-6 justify-between">
        <h3 className="mb-1">Line segment</h3>
        <button
          type="button"
          className={"px-2 py-1 border rounded-sm" + (changed ? "" : " invisible")}
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
      <div className="flex flex-col gap-1">
        <InlineField label="Length">
          <div className="w-20">
            <NumberInput value={sizeLatest} onChange={handleLengthChange} min={0} slider keepFocus />
          </div>
        </InlineField>
        <BlockGroupField label="Angle">
          <InlineField label="Degree">
            <div className="w-20">
              <NumberInput
                value={(normalizeRadian(radianLatest - originRadianLatest) * 180) / Math.PI}
                onChange={handleAngleChange}
                slider
                keepFocus
              />
            </div>
          </InlineField>
          <InlineField label="Relative">
            <ToggleInput value={relativeAngle} onChange={handleRelativeOriginChange} />
          </InlineField>
        </BlockGroupField>
      </div>
    </div>
  );
};
