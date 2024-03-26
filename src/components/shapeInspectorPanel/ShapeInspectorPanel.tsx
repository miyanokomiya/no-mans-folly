import { useCallback, useContext, useMemo } from "react";
import { useSelectedShape, useSelectedTmpShape } from "../../hooks/storeHooks";
import { ConventionalShapeInspector } from "./ConventionalShapeInspector";
import { getPatchByLayouts } from "../../composables/shapeLayoutHandler";
import { InlineField } from "../atoms/InlineField";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";
import { Shape } from "../../models";
import { LineShapeInspector } from "./LineShapeInspector";
import { LineShape, isLineShape } from "../../shapes/line";
import { GroupConstraintInspector } from "./GroupConstraintInspector";

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

const ShapeInspectorPanelWithShape: React.FC<ShapeInspectorPanelWithShapeProps> = ({ targetShape, targetTmpShape }) => {
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

  const updateTargetShape = useCallback(
    (patch: Partial<Shape>) => {
      const shapeComposite = getShapeComposite();
      const layoutPatch = getPatchByLayouts(shapeComposite, {
        update: { [targetShape.id]: patch },
      });
      patchShapes(layoutPatch);
    },
    [targetShape, getShapeComposite, patchShapes],
  );

  const shapeLabel = useMemo<string>(() => {
    const shapeComposite = getShapeComposite();
    return shapeComposite.getShapeStruct(targetShape.type).label;
  }, [getShapeComposite, targetShape]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <InlineField label={"Shape type"}>
        <span>{shapeLabel}</span>
      </InlineField>
      {isLineShape(targetShape) ? (
        <LineShapeInspector
          targetShape={targetShape}
          targetTmpShape={targetTmpShape as LineShape}
          commit={commit}
          updateTmpTargetShape={updateTmpTargetShape}
          readyState={readyState}
        />
      ) : (
        <ConventionalShapeInspector
          targetShape={targetShape}
          targetTmpShape={targetTmpShape}
          commit={commit}
          updateTmpTargetShape={updateTmpTargetShape}
          readyState={readyState}
        />
      )}
      <GroupConstraintInspector targetShape={targetShape} updateTargetShape={updateTargetShape} />
      <button type="submit" className="hidden" />
    </form>
  );
};
