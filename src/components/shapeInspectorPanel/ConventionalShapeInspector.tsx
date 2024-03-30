import { useCallback, useMemo } from "react";
import { PointField } from "./PointField";
import { AffineMatrix, IRectangle, IVec2, getCenter, multiAffines } from "okageo";
import { Shape } from "../../models";
import { getRectWithRotationFromRectPolygon } from "../../utils/geometry";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { ShapeComposite } from "../../composables/shapeComposite";
import { InlineField } from "../atoms/InlineField";
import { BlockField } from "../atoms/BlockField";
import { useShapeComposite, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { resizeShapeTrees } from "../../composables/shapeResizing";

interface Props {
  targetShape: Shape;
  targetTmpShape: Shape;
  commit: () => void;
  updateTmpShapes: (patch: { [id: string]: Partial<Shape> }) => void;
  readyState: () => void;
}

export const ConventionalShapeInspector: React.FC<Props> = ({
  targetShape,
  targetTmpShape,
  commit,
  updateTmpShapes,
  readyState,
}) => {
  const shapeComposite = useShapeComposite();
  const subShapeComposite = useShapeCompositeWithoutTmpInfo(useMemo(() => [targetShape.id], [targetShape.id]));

  const targetLocalBounds = useMemo<[IRectangle, rotation: number]>(() => {
    return getRectWithRotationFromRectPolygon(shapeComposite.getLocalRectPolygon(targetTmpShape));
  }, [targetTmpShape, shapeComposite]);

  const targetLocation = useMemo<IVec2>(() => {
    return targetLocalBounds[0];
  }, [targetLocalBounds]);

  const targetSize = useMemo<IVec2>(() => {
    return { x: targetLocalBounds[0].width, y: targetLocalBounds[0].height };
  }, [targetLocalBounds]);

  const handleResize = useCallback(
    (affine: AffineMatrix, draft = false) => {
      if (draft) {
        readyState();

        const targets = subShapeComposite.getAllTransformTargets([targetShape.id]);
        const patch: { [id: string]: Partial<Shape> } = {};
        targets.forEach((s) => {
          patch[s.id] = subShapeComposite.transformShape(s, affine);
        });

        updateTmpShapes(patch);
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpShapes, targetShape, subShapeComposite],
  );

  const handleChangePosition = useCallback(
    (val: IVec2, draft = false) => {
      const affine = getMoveToAffine(subShapeComposite, targetShape, val);
      handleResize(affine, draft);
    },
    [targetShape, subShapeComposite, handleResize],
  );

  const handleChangeSize = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        const affine = getScaleToAffine(subShapeComposite, targetShape, val);
        const patch = resizeShapeTrees(subShapeComposite, [targetShape.id], affine);
        updateTmpShapes(patch);
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpShapes, targetShape, subShapeComposite],
  );

  const handleChangeRotation = useCallback(
    (val: number, draft = false) => {
      const affine = getRotateToAffine(subShapeComposite, targetShape, (val * Math.PI) / 180);
      handleResize(affine, draft);
    },
    [targetShape, subShapeComposite, handleResize],
  );

  return (
    <>
      <BlockField label={"Position (x, y)"}>
        <PointField value={targetLocation} onChange={handleChangePosition} />
      </BlockField>
      <BlockField label={"Size (width, height)"}>
        <PointField value={targetSize} onChange={handleChangeSize} min={1} />
      </BlockField>
      <InlineField label={"Rotation (degree)"}>
        <div className="w-24">
          <NumberInput
            value={(targetLocalBounds[1] * 180) / Math.PI}
            onChange={handleChangeRotation}
            onBlur={commit}
            keepFocus
            slider
          />
        </div>
      </InlineField>
    </>
  );
};

function getMoveToAffine(subShapeComposite: ShapeComposite, shape: Shape, to: IVec2): AffineMatrix {
  const [origin] = getRectWithRotationFromRectPolygon(subShapeComposite.getLocalRectPolygon(shape));
  return [1, 0, 0, 1, to.x - origin.x, to.y - origin.y];
}

function getScaleToAffine(subShapeComposite: ShapeComposite, shape: Shape, to: IVec2): AffineMatrix {
  const polygon = subShapeComposite.getLocalRectPolygon(shape);
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

function getRotateToAffine(subShapeComposite: ShapeComposite, shape: Shape, to: number): AffineMatrix {
  const polygon = subShapeComposite.getLocalRectPolygon(shape);
  const origin = getCenter(polygon[0], polygon[2]);
  const sin = Math.sin(to - shape.rotation);
  const cos = Math.cos(to - shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}
