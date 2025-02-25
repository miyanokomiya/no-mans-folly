import { useCallback, useContext } from "react";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { AppStateMachineContext } from "../../contexts/AppContext";
import { useShapeComposite } from "../../hooks/storeHooks";
import { getLinePath, LineShape } from "../../shapes/line";
import { getDistance, getRadian } from "okageo";
import { getSegments } from "../../utils/geometry";
import { InlineField } from "../atoms/InlineField";

interface Props {
  shapeId: string;
  segmentIndex: number;
}

export const FloatMenuLineSegment: React.FC<Props> = ({ shapeId, segmentIndex }) => {
  const { handleEvent } = useContext(AppStateMachineContext);
  const shapeComposite = useShapeComposite();

  const lineShapeSrc = shapeComposite.shapeMap[shapeId] as LineShape;
  const segmentSrc = getSegments(getLinePath(lineShapeSrc))[segmentIndex];
  const sizeSrc = getDistance(segmentSrc[0], segmentSrc[1]);
  const radianSrc = getRadian(segmentSrc[1], segmentSrc[0]);

  const lineShapeLatest = shapeComposite.mergedShapeMap[shapeId] as LineShape;
  const segmentLatest = getSegments(getLinePath(lineShapeLatest))[segmentIndex];
  const sizeLatest = getDistance(segmentLatest[0], segmentLatest[1]);
  const radianLatest = getRadian(segmentLatest[1], segmentLatest[0]);

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
      handleEvent({
        type: "line-segment-change",
        data: { radian: (val * Math.PI) / 180 },
      });
    },
    [handleEvent],
  );

  const handleReset = useCallback(() => {
    handleEvent({
      type: "line-segment-change",
      data: { size: sizeSrc, radian: radianSrc },
    });
  }, [handleEvent, sizeSrc, radianSrc]);

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
      <InlineField label="Length">
        <div className="w-20">
          <NumberInput value={sizeLatest} onChange={handleLengthChange} min={0} slider keepFocus />
        </div>
      </InlineField>
      <InlineField label="Angle">
        <div className="w-20">
          <NumberInput value={(radianLatest * 180) / Math.PI} onChange={handleAngleChange} slider keepFocus />
        </div>
      </InlineField>
    </div>
  );
};
