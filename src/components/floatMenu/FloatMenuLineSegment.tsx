import { useCallback, useContext } from "react";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { AppStateMachineContext } from "../../contexts/AppContext";
import { normalizeRadian } from "../../utils/geometry";
import { InlineField } from "../atoms/InlineField";
import { BlockGroupField } from "../atoms/BlockGroupField";
import { ToggleInput } from "../atoms/inputs/ToggleInput";

interface Props {
  size: number;
  radian: number;
  relativeAngle?: boolean;
  changed?: boolean;
}

export const FloatMenuLineSegment: React.FC<Props> = ({ size, radian, relativeAngle, changed }) => {
  const { handleEvent } = useContext(AppStateMachineContext);

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
      const radian = (val * Math.PI) / 180;
      handleEvent({
        type: "line-segment-change",
        data: { radian },
      });
    },
    [handleEvent],
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
    <div className="p-1">
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
            <NumberInput value={size} onChange={handleLengthChange} min={0} slider keepFocus />
          </div>
        </InlineField>
        <BlockGroupField label="Angle">
          <InlineField label="Degree">
            <div className="w-20">
              <NumberInput
                value={(normalizeRadian(radian) * 180) / Math.PI}
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
