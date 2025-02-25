import { useCallback, useContext } from "react";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { AppStateMachineContext } from "../../contexts/AppContext";
import { useShapeComposite } from "../../hooks/storeHooks";
import { getLinePath, LineShape } from "../../shapes/line";
import { getDistance } from "okageo";
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

  const lineShapeLatest = shapeComposite.mergedShapeMap[shapeId] as LineShape;
  const segmentLatest = getSegments(getLinePath(lineShapeLatest))[segmentIndex];
  const sizeLatest = getDistance(segmentLatest[0], segmentLatest[1]);

  const handleLengthChange = useCallback(
    (val: number) => {
      handleEvent({
        type: "line-segment-change",
        data: { size: val },
      });
    },
    [handleEvent],
  );
  const handleLengthReset = useCallback(() => {
    handleEvent({
      type: "line-segment-change",
      data: { size: sizeSrc },
    });
  }, [handleEvent, sizeSrc]);

  return (
    <div className="flex gap-1.5 items-center py-1">
      <div>
        <div className="mb-1 flex items-center gap-2 justify-between">
          <h3 className="mb-1">Smart branch settings</h3>
          <button
            type="button"
            className={"px-2 py-1 border rounded-sm" + (sizeSrc !== sizeLatest ? "" : " invisible")}
            onClick={handleLengthReset}
          >
            Reset
          </button>
        </div>
        <div className="flex gap-1 items-center">
          <InlineField label="Length">
            <div className="w-20">
              <NumberInput value={sizeLatest} onChange={handleLengthChange} min={0} slider keepFocus />
            </div>
          </InlineField>
        </div>
      </div>
    </div>
  );
};
