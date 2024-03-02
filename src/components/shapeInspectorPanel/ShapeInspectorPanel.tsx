import { useCallback, useContext } from "react";
import { useSelectedShape, useSelectedTmpShape } from "../../hooks/storeHooks";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";

export const ShapeInspectorPanel: React.FC = () => {
  const sm = useContext(AppStateMachineContext);
  const smctx = useContext(AppStateContext);
  const { shapeStore } = useContext(AppCanvasContext);
  const targetShape = useSelectedShape();
  const targetTmpShape = useSelectedTmpShape();

  const readyState = useCallback(() => {
    sm.handleEvent({
      type: "state",
      data: { name: "ShapeInspection" },
    });
  }, [sm]);

  const breakState = useCallback(() => {
    sm.handleEvent({
      type: "state",
      data: { name: "Break" },
    });
  }, [sm]);

  /**
   * Expected behavior of input field.
   * - Update tmp data during inputting text/number manually.
   * - Commit tmp data on input blur.
   * - Commit tmp data on form submit.
   * - Update tmp data during manipulating a slider.
   * - Commit tmp data on slider mouseup.
   */
  const commit = useCallback(() => {
    const tmpMap = shapeStore.getTmpShapeMap();
    // Make sure to always clear tmp map.
    shapeStore.setTmpShapeMap({});
    breakState();

    if (!targetShape) return;

    const tmp = tmpMap[targetShape.id];
    if (!tmp) return;

    smctx.patchShapes({ [targetShape.id]: tmp });
  }, [shapeStore, targetShape, smctx, breakState]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      commit();
    },
    [commit],
  );

  const handleChangeX = useCallback(
    (val: number, draft = false) => {
      if (!targetShape) return;

      if (draft) {
        readyState();
        shapeStore.setTmpShapeMap({
          [targetShape.id]: { p: { x: val, y: targetShape.p.y } },
        });
      } else {
        commit();
      }
    },
    [shapeStore, targetShape, commit, readyState],
  );

  const handleChangeY = useCallback(
    (val: number, draft = false) => {
      if (!targetShape) return;

      if (draft) {
        readyState();
        shapeStore.setTmpShapeMap({
          [targetShape.id]: { p: { x: targetShape.p.x, y: val } },
        });
      } else {
        commit();
      }
    },
    [shapeStore, targetShape, commit, readyState],
  );

  return targetTmpShape ? (
    <div className="">
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <span className="mr-auto">Position:</span>
        <span>(</span>
        <div className="w-20">
          <NumberInput value={targetTmpShape.p.x} onChange={handleChangeX} onBlur={commit} keepFocus slider />
        </div>
        <span>,</span>
        <div className="w-20">
          <NumberInput value={targetTmpShape.p.y} onChange={handleChangeY} onBlur={commit} keepFocus slider />
        </div>
        <span>)</span>
        <button type="submit" className="hidden" />
      </form>
    </div>
  ) : (
    <div>No shape selected</div>
  );
};
