import { useCallback, useContext } from "react";
import { useSelectedShape, useSelectedTmpShape } from "../../hooks/storeHooks";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";
import { getPatchByLayouts } from "../../composables/shapeLayoutHandler";
import { Shape } from "../../models";

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
    const tmp = shapeStore.getTmpShapeMap();
    if (Object.keys(tmp).length === 0) return;

    shapeStore.setTmpShapeMap({});
    breakState();
    smctx.patchShapes(tmp);
  }, [shapeStore, smctx, breakState]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      commit();
    },
    [commit],
  );

  const updateTmpTargetShape = useCallback(
    (patch: Partial<Shape>) => {
      if (!targetShape) return;

      const shapeComposite = smctx.getShapeComposite();
      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: { [targetShape.id]: patch },
      });
      smctx.setTmpShapeMap(layoutPatch);
    },
    [smctx, targetShape],
  );

  const handleChangeP = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();
        updateTmpTargetShape({ p: val });
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape],
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
