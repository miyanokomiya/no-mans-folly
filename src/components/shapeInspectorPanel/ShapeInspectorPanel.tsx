import { useCallback, useContext } from "react";
import { useSelectedShape, useSelectedTmpShape } from "../../hooks/storeHooks";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";

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

  const handleChangeP = useCallback(
    (val: IVec2, draft = false) => {
      if (!targetShape) return;

      if (draft) {
        readyState();
        shapeStore.setTmpShapeMap({ [targetShape.id]: { p: val } });
      } else {
        commit();
      }
    },
    [shapeStore, targetShape, commit, readyState],
  );

  return targetTmpShape ? (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <span className="mr-auto">Position:</span>
        <PointField value={targetTmpShape.p} onChange={handleChangeP} />
      </div>
      <button type="submit" className="hidden" />
    </form>
  ) : (
    <div>No shape selected</div>
  );
};
