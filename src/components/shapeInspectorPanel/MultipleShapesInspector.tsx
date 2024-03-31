import { useCallback, useMemo } from "react";
import { PointField } from "./PointField";
import { AffineMatrix, IRectangle, IVec2, multiAffines } from "okageo";
import { Shape } from "../../models";
import { BlockField } from "../atoms/BlockField";
import { useShapeComposite, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { resizeShapeTrees } from "../../composables/shapeResizing";

interface Props {
  targetShapes: Shape[];
  targetTmpShapes: Shape[];
  commit: () => void;
  updateTmpShapes: (patch: { [id: string]: Partial<Shape> }) => void;
  readyState: () => void;
}

export const MultipleShapesInspector: React.FC<Props> = ({
  targetShapes,
  targetTmpShapes,
  commit,
  updateTmpShapes,
  readyState,
}) => {
  const shapeComposite = useShapeComposite();
  const targetIds = useMemo(() => targetShapes.map((s) => s.id), [targetShapes]);
  const subShapeComposite = useShapeCompositeWithoutTmpInfo(targetIds);

  const targetLocalBounds = useMemo<IRectangle>(() => {
    return shapeComposite.getWrapperRectForShapes(targetShapes);
  }, [targetShapes, shapeComposite]);

  const tmpTargetLocalBounds = useMemo<IRectangle>(() => {
    return shapeComposite.getWrapperRectForShapes(targetTmpShapes);
  }, [targetTmpShapes, shapeComposite]);

  const tmpTargetLocation = useMemo<IVec2>(() => {
    return { x: tmpTargetLocalBounds.x, y: tmpTargetLocalBounds.y };
  }, [tmpTargetLocalBounds]);

  const tmpTargetSize = useMemo<IVec2>(() => {
    return { x: tmpTargetLocalBounds.width, y: tmpTargetLocalBounds.height };
  }, [tmpTargetLocalBounds]);

  const handleResize = useCallback(
    (affine: AffineMatrix, draft = false) => {
      if (draft) {
        readyState();

        const targets = subShapeComposite.getAllTransformTargets(targetIds);
        const patch: { [id: string]: Partial<Shape> } = {};
        targets.forEach((s) => {
          patch[s.id] = subShapeComposite.transformShape(s, affine);
        });

        updateTmpShapes(patch);
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpShapes, targetIds, subShapeComposite],
  );

  const handleChangePosition = useCallback(
    (val: IVec2, draft = false) => {
      const affine = getMoveToAffine(targetLocalBounds, val);
      handleResize(affine, draft);
    },
    [targetLocalBounds, handleResize],
  );

  const handleChangeSize = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        const affine = getScaleToAffine(targetLocalBounds, val);
        const patch = resizeShapeTrees(subShapeComposite, targetIds, affine);
        updateTmpShapes(patch);
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpShapes, targetLocalBounds, targetIds, subShapeComposite],
  );

  // Rotation of multiple shapes isn't supported.
  // => There's no good way to keep the rotation in component realm unlike Rotating state.
  return (
    <>
      <BlockField label={"Position (x, y)"}>
        <PointField value={tmpTargetLocation} onChange={handleChangePosition} />
      </BlockField>
      <BlockField label={"Size (width, height)"}>
        <PointField value={tmpTargetSize} onChange={handleChangeSize} min={1} />
      </BlockField>
    </>
  );
};

function getMoveToAffine(rect: IRectangle, to: IVec2): AffineMatrix {
  return [1, 0, 0, 1, to.x - rect.x, to.y - rect.y];
}

function getScaleToAffine(rect: IRectangle, to: IVec2): AffineMatrix {
  const origin = rect;

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [to.x / rect.width, 0, 0, to.y / rect.height, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}
