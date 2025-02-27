import { useCallback, useMemo } from "react";
import { AffineMatrix, IRectangle } from "okageo";
import { Shape } from "../../models";
import { useShapeComposite, useStaticShapeComposite } from "../../hooks/storeHooks";
import { resizeShapeTrees } from "../../composables/shapeResizing";
import { BoundsField } from "./BoundsField";

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
  const staticShapeComposite = useStaticShapeComposite();
  const subShapeComposite = useMemo(() => {
    return staticShapeComposite.getSubShapeComposite(targetIds);
  }, [staticShapeComposite, targetIds]);

  const targetLocalBounds = useMemo<IRectangle>(() => {
    return shapeComposite.getWrapperRectForShapes(targetShapes);
  }, [targetShapes, shapeComposite]);

  const tmpTargetLocalBounds = useMemo<IRectangle>(() => {
    return shapeComposite.getWrapperRectForShapes(targetTmpShapes);
  }, [targetTmpShapes, shapeComposite]);

  const handleBoundsChange = useCallback(
    (affine: AffineMatrix, draft = false) => {
      if (draft) {
        readyState();

        const patch = resizeShapeTrees(subShapeComposite, targetIds, affine);
        updateTmpShapes(patch);
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpShapes, targetIds, subShapeComposite],
  );

  // Rotation of multiple shapes isn't supported.
  // => There's no good way to keep the rotation in component realm unlike Rotating state.
  return (
    <BoundsField bounds={targetLocalBounds} draftBounds={tmpTargetLocalBounds} onBoundsChange={handleBoundsChange} />
  );
};
