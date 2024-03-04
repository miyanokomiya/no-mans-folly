import { useCallback, useContext, useMemo } from "react";
import { useSelectedShape, useSelectedTmpShape } from "../../hooks/storeHooks";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";
import { PointField } from "./PointField";
import { AffineMatrix, IRectangle, IVec2, multiAffines } from "okageo";
import { getPatchByLayouts } from "../../composables/shapeLayoutHandler";
import { Shape } from "../../models";
import { resizeShape } from "../../shapes";
import { ShapeComposite } from "../../composables/shapeComposite";
import { getRectWithRotationFromRectPolygon } from "../../utils/geometry";

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

  const targetLocation = useMemo<IVec2>(() => {
    const shapeComposite = getShapeComposite();
    return shapeComposite.getLocalRectPolygon(targetTmpShape)[0];
  }, [getShapeComposite, targetTmpShape]);

  const handleChangePosition = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        const shapeComposite = getShapeComposite();
        updateTmpTargetShape(
          resizeShape(shapeComposite.getShapeStruct, targetShape, getMoveToAffine(shapeComposite, targetShape, val)),
        );
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape, targetShape, getShapeComposite],
  );

  const targetLocalBounds = useMemo<[IRectangle, rotation: number]>(() => {
    const shapeComposite = getShapeComposite();
    return getRectWithRotationFromRectPolygon(shapeComposite.getLocalRectPolygon(targetTmpShape));
  }, [targetTmpShape, getShapeComposite]);

  const targetSize = useMemo<IVec2>(() => {
    return { x: targetLocalBounds[0].width, y: targetLocalBounds[0].height };
  }, [targetLocalBounds]);

  const handleChangeSize = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        const shapeComposite = getShapeComposite();
        updateTmpTargetShape(
          resizeShape(shapeComposite.getShapeStruct, targetShape, getScaleToAffine(shapeComposite, targetShape, val)),
        );
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape, targetShape, getShapeComposite],
  );

  return (
    <form onSubmit={handleSubmit}>
      <BlockField label={"Position"}>
        <PointField value={targetLocation} onChange={handleChangePosition} />
      </BlockField>
      <BlockField label={"Size"}>
        <PointField value={targetSize} onChange={handleChangeSize} min={1} />
      </BlockField>
      <button type="submit" className="hidden" />
    </form>
  );
};

const BlockField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  return (
    <div className="flex flex-col">
      <span>{label}:</span>
      <div className="ml-auto">{children}</div>
    </div>
  );
};

function getMoveToAffine(shapeComposite: ShapeComposite, shape: Shape, to: IVec2): AffineMatrix {
  const [origin] = shapeComposite.getLocalRectPolygon(shape);
  return [1, 0, 0, 1, to.x - origin.x, to.y - origin.y];
}

function getScaleToAffine(shapeComposite: ShapeComposite, shape: Shape, to: IVec2): AffineMatrix {
  const polygon = shapeComposite.getLocalRectPolygon(shape);
  const [rect] = getRectWithRotationFromRectPolygon(polygon);
  const origin = polygon[0];
  const sin = Math.sin(shape.rotation);
  const cos = Math.cos(shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [cos, sin, -sin, cos, 0, 0],
    [to.x / rect.width, 0, 0, to.y / rect.height, 0, 0],
    [cos, -sin, sin, cos, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}
