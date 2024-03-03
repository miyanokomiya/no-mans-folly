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
  const sm = useContext(AppStateMachineContext);
  const smctx = useContext(AppStateContext);

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
    const tmp = smctx.getTmpShapeMap();
    if (Object.keys(tmp).length === 0) return;

    smctx.setTmpShapeMap({});
    breakState();
    smctx.patchShapes(tmp);
  }, [smctx, breakState]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      commit();
    },
    [commit],
  );

  const updateTmpTargetShape = useCallback(
    (patch: Partial<Shape>) => {
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

        const shapeComposite = smctx.getShapeComposite();
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
    [commit, readyState, updateTmpTargetShape, smctx, targetShape],
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
