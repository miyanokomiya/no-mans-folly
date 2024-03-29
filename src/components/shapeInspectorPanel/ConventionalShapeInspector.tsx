import { useCallback, useMemo } from "react";
import { PointField } from "./PointField";
import { AffineMatrix, IRectangle, IVec2, getCenter, multiAffines } from "okageo";
import { Shape } from "../../models";
import { getRectWithRotationFromRectPolygon } from "../../utils/geometry";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { ShapeComposite } from "../../composables/shapeComposite";
import { InlineField } from "../atoms/InlineField";
import { BlockField } from "../atoms/BlockField";
import { useShapeComposite } from "../../hooks/storeHooks";

interface Props {
  targetShape: Shape;
  targetTmpShape: Shape;
  commit: () => void;
  updateTmpTargetShape: (patch: Partial<Shape>) => void;
  readyState: () => void;
}

export const ConventionalShapeInspector: React.FC<Props> = ({
  targetShape,
  targetTmpShape,
  commit,
  updateTmpTargetShape,
  readyState,
}) => {
  const shapeComposite = useShapeComposite();

  const targetLocation = useMemo<IVec2>(() => {
    return shapeComposite.getLocalRectPolygon(targetTmpShape)[0];
  }, [shapeComposite, targetTmpShape]);

  const handleChangePosition = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        updateTmpTargetShape(
          shapeComposite.transformShape(targetShape, getMoveToAffine(shapeComposite, targetShape, val)),
        );
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape, targetShape, shapeComposite],
  );

  const targetLocalBounds = useMemo<[IRectangle, rotation: number]>(() => {
    return getRectWithRotationFromRectPolygon(shapeComposite.getLocalRectPolygon(targetTmpShape));
  }, [targetTmpShape, shapeComposite]);

  const targetSize = useMemo<IVec2>(() => {
    return { x: targetLocalBounds[0].width, y: targetLocalBounds[0].height };
  }, [targetLocalBounds]);

  const handleChangeSize = useCallback(
    (val: IVec2, draft = false) => {
      if (draft) {
        readyState();

        updateTmpTargetShape(
          shapeComposite.transformShape(targetShape, getScaleToAffine(shapeComposite, targetShape, val)),
        );
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape, targetShape, shapeComposite],
  );

  const handleChangeRotation = useCallback(
    (val: number, draft = false) => {
      if (draft) {
        readyState();

        updateTmpTargetShape(
          shapeComposite.transformShape(
            targetShape,
            getRotateToAffine(shapeComposite, targetShape, (val * Math.PI) / 180),
          ),
        );
      } else {
        commit();
      }
    },
    [commit, readyState, updateTmpTargetShape, targetShape, shapeComposite],
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

function getRotateToAffine(shapeComposite: ShapeComposite, shape: Shape, to: number): AffineMatrix {
  const polygon = shapeComposite.getLocalRectPolygon(shape);
  const origin = getCenter(polygon[0], polygon[2]);
  const sin = Math.sin(to - shape.rotation);
  const cos = Math.cos(to - shape.rotation);

  return multiAffines([
    [1, 0, 0, 1, origin.x, origin.y],
    [cos, sin, -sin, cos, 0, 0],
    [1, 0, 0, 1, -origin.x, -origin.y],
  ]);
}
