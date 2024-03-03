import { useCallback, useContext } from "react";
import { useSelectedShape, useSelectedTmpShape } from "../../hooks/storeHooks";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";
import { PointField } from "./PointField";
import { IVec2 } from "okageo";
import { getPatchByLayouts } from "../../composables/shapeLayoutHandler";
import { Shape } from "../../models";
import { resizeShape } from "../../shapes";

export const ShapeInspectorPanel: React.FC = () => {
  const targetShape = useSelectedShape();
  const targetTmpShape = useSelectedTmpShape();

  return targetShape && targetTmpShape ? (
    <ShapeInspectorPanelWithShape targetShape={targetShape} targetTmpShape={targetTmpShape} />
  ) : (
    <div>No shape selected</div>
  );
};

interface ShapeInspectorPanelWithShapeProps {
  targetShape: Shape;
  targetTmpShape: Shape;
}

export const ShapeInspectorPanelWithShape: React.FC<ShapeInspectorPanelWithShapeProps> = ({
  targetShape,
  targetTmpShape,
}) => {
  const { handleEvent } = useContext(AppStateMachineContext);
  const { getTmpShapeMap, setTmpShapeMap, patchShapes, getShapeComposite } = useContext(AppStateContext);

  const readyState = useCallback(() => {
    handleEvent({
      type: "state",
      data: { name: "ShapeInspection" },
    });
  }, [handleEvent]);

  const breakState = useCallback(() => {
    handleEvent({
      type: "state",
      data: { name: "Break" },
    });
  }, [handleEvent]);

  /**
   * Expected behavior of input field.
   * - Update tmp data during inputting text/number manually.
   * - Commit tmp data on input blur.
   * - Commit tmp data on form submit.
   * - Update tmp data during manipulating a slider.
   * - Commit tmp data on slider mouseup.
   */
  const commit = useCallback(() => {
    const tmp = getTmpShapeMap();
    if (Object.keys(tmp).length === 0) return;

    setTmpShapeMap({});
    breakState();
    patchShapes(tmp);
  }, [getTmpShapeMap, setTmpShapeMap, patchShapes, breakState]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      commit();
    },
    [commit],
  );

  const updateTmpTargetShape = useCallback(
    (patch: Partial<Shape>) => {
      const shapeComposite = getShapeComposite();
      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: { [targetShape.id]: patch },
      });
      setTmpShapeMap(layoutPatch);
    },
    [targetShape, getShapeComposite, setTmpShapeMap],
  );

  const handleChangeP = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        const shapeComposite = getShapeComposite();
        updateTmpTargetShape(
          resizeShape(shapeComposite.getShapeStruct, targetShape, [
            1,
            0,
            0,
            1,
            val.x - targetShape.p.x,
            val.y - targetShape.p.y,
          ]),
        );
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape, targetShape, getShapeComposite],
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <span className="mr-auto">Position:</span>
        <PointField value={targetTmpShape.p} onChange={handleChangeP} />
      </div>
      <button type="submit" className="hidden" />
    </form>
  );
};
