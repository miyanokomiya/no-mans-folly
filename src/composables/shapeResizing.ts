import { AffineMatrix, IRectangle, IVec2, applyAffine, getCenter, getOuterRectangle, multiAffines } from "okageo";
import { GroupConstraint, Shape } from "../models";
import * as geometry from "../utils/geometry";
import { walkTreeWithValue } from "../utils/tree";
import { isGroupShape } from "../shapes/group";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";

type TreeStepGroupValue = {
  affine: AffineMatrix;
  parentResizedRotationAffine: AffineMatrix;
  parentDerotationAffine: AffineMatrix;
  parentDerotationResizedAffine: AffineMatrix;
  parentDerotatedRect: IRectangle;
  parentDerotatedResizedRect: IRectangle;
};

export function resizeShapeTrees(
  shapeComposite: ShapeComposite,
  targetIds: string[],
  affine: AffineMatrix,
): { [id: string]: Partial<Shape> } {
  const shapeMap = shapeComposite.shapeMap;
  const targetTrees = targetIds.map((id) => shapeComposite.mergedShapeTreeMap[id]);
  const allBranchIds = shapeComposite.getAllBranchMergedShapes(targetIds).map((s) => s.id);
  const allBranchShsapes = allBranchIds.map((id) => shapeMap[id]);

  const minShapeComposite = newShapeComposite({
    getStruct: shapeComposite.getShapeStruct,
    shapes: allBranchShsapes,
  });

  const srcInfoMap: { [id: string]: { localPolygon: IVec2[] } } = {};

  const rowResizedList = allBranchIds.map<[Shape, Partial<Shape>]>((id) => {
    const s = shapeMap[id];
    srcInfoMap[id] = { localPolygon: minShapeComposite.getLocalRectPolygon(s) };
    const patch = minShapeComposite.transformShape(s, affine);
    return [{ ...s, ...patch }, patch];
  });

  const resizedComposite = newShapeComposite({
    getStruct: minShapeComposite.getShapeStruct,
    shapes: rowResizedList.map(([s]) => s),
  });

  const rowResizedInfoMap: { [id: string]: { localPolygon: IVec2[]; shape: Shape; patch: Partial<Shape> } } = {};

  rowResizedList.forEach(([resized, patch]) => {
    rowResizedInfoMap[resized.id] = {
      localPolygon: resizedComposite.getLocalRectPolygon(resized),
      shape: resized,
      patch,
    };
  });

  const ret: { [id: string]: Partial<Shape> } = {};

  walkTreeWithValue<TreeStepGroupValue | { inheritedAffine: AffineMatrix } | undefined>(
    targetTrees,
    (node, _, data) => {
      const shape = shapeMap[node.id];

      if (data && "inheritedAffine" in data) {
        const patch = minShapeComposite.transformShape(shape, data.inheritedAffine);
        ret[node.id] = patch;
        return data;
      }

      const resizingAffine = data?.affine ?? affine;
      const localPolygon = srcInfoMap[shape.id].localPolygon;

      const rowResizedInfo = rowResizedInfoMap[shape.id];
      const resizedLocalPolygon = localPolygon.map((p) => applyAffine(resizingAffine, p));

      if (!data) {
        ret[node.id] = rowResizedInfo.patch;
        if (!isGroupShape(shape)) return;

        return createTreeStepGroupValue(resizingAffine, minShapeComposite, shape, localPolygon, resizedLocalPolygon);
      }

      const normalizedSrcRect = getOuterRectangle([
        localPolygon.map((p) => applyAffine(data.parentDerotationAffine, p)),
      ]);

      const normalizedResizedRect = getOuterRectangle([
        resizedLocalPolygon.map((p) => applyAffine(data.parentDerotationResizedAffine, p)),
      ]);
      const resizedCenter = getCenter(resizedLocalPolygon[0], resizedLocalPolygon[2]);

      const constraintAffine = getConstraintAdjustmentAffine(
        shape.gcV,
        shape.gcH,
        normalizedSrcRect,
        normalizedResizedRect,
        resizedCenter,
        data.parentDerotatedRect,
        data.parentDerotatedResizedRect,
      );

      if (!constraintAffine) {
        ret[node.id] = rowResizedInfo.patch;
        if (!isGroupShape(shape)) return { inheritedAffine: resizingAffine };

        return createTreeStepGroupValue(resizingAffine, minShapeComposite, shape, localPolygon, resizedLocalPolygon);
      }

      const adjustmentAffine = multiAffines([
        data.parentResizedRotationAffine,
        constraintAffine,
        data.parentDerotationResizedAffine,
      ]);

      const adjustmentPatch = resizedComposite.transformShape(rowResizedInfo.shape, adjustmentAffine);
      ret[node.id] = { ...rowResizedInfo.patch, ...adjustmentPatch };
      if (!isGroupShape(shape)) return { inheritedAffine: multiAffines([adjustmentAffine, resizingAffine]) };

      const adjustedLocalPolygon = resizedLocalPolygon.map((p) => applyAffine(adjustmentAffine, p));
      return createTreeStepGroupValue(resizingAffine, minShapeComposite, shape, localPolygon, adjustedLocalPolygon);
    },
    undefined,
  );

  return ret;
}

function createTreeStepGroupValue(
  affine: AffineMatrix,
  shapeComposite: ShapeComposite,
  shape: Shape,
  localPolygon: IVec2[],
  resizedLocalPolygon: IVec2[],
): TreeStepGroupValue {
  const srcCenter = getCenter(localPolygon[0], localPolygon[2]);
  const resizedCenter = getCenter(resizedLocalPolygon[0], resizedLocalPolygon[2]);
  const rotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, shape.rotation);

  const derotationAffine = geometry.getRotatedAtAffine(srcCenter, -shape.rotation);
  const derotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, -shape.rotation);

  const derotatedRect = shapeComposite.getWrapperRect({ ...shape, rotation: 0 });
  const derotatedResizedRect = getOuterRectangle([
    resizedLocalPolygon.map((p) => applyAffine(derotationResizedAffine, p)),
  ]);

  return {
    affine,
    parentResizedRotationAffine: rotationResizedAffine,
    parentDerotationResizedAffine: derotationResizedAffine,
    parentDerotatedRect: derotatedRect,
    parentDerotatedResizedRect: derotatedResizedRect,
    parentDerotationAffine: derotationAffine,
  };
}

function getConstraintAdjustmentAffine(
  gcV: GroupConstraint | undefined,
  gcH: GroupConstraint | undefined,
  normalizedSrcRect: IRectangle,
  normalizedResizedRect: IRectangle,
  resizedCenter: IVec2,
  parentDerotatedRect: IRectangle,
  parentDerotatedResizedRect: IRectangle,
): AffineMatrix | undefined {
  const vAffine = getVerticalConstraintAdjustmentAffine(
    gcV,
    [normalizedSrcRect.y, normalizedSrcRect.height],
    [normalizedResizedRect.y, normalizedResizedRect.height],
    resizedCenter.y,
    [parentDerotatedRect.y, parentDerotatedRect.height],
    [parentDerotatedResizedRect.y, parentDerotatedResizedRect.height],
  );

  const hAffine = swapSimpleAffineDirection(
    getVerticalConstraintAdjustmentAffine(
      gcH,
      [normalizedSrcRect.x, normalizedSrcRect.width],
      [normalizedResizedRect.x, normalizedResizedRect.width],
      resizedCenter.x,
      [parentDerotatedRect.x, parentDerotatedRect.width],
      [parentDerotatedResizedRect.x, parentDerotatedResizedRect.width],
    ),
  );

  if (vAffine && hAffine) {
    return multiAffines([vAffine, hAffine]);
  } else {
    return vAffine || hAffine;
  }
}

type RectRange = [from: number, size: number];

function getVerticalConstraintAdjustmentAffine(
  gcV: GroupConstraint | undefined,
  normalizedSrcRange: RectRange,
  normalizedResizedRange: RectRange,
  resizedCenter: number,
  parentDerotatedRange: RectRange,
  parentDerotatedResizedRange: RectRange,
): AffineMatrix | undefined {
  switch (gcV) {
    case 1: {
      const targetTopMargin = normalizedSrcRange[0] - parentDerotatedRange[0];
      const resizedTopMargin = normalizedResizedRange[0] - parentDerotatedResizedRange[0];
      const diff = targetTopMargin - resizedTopMargin;
      return multiAffines([
        [1, 0, 0, 1, 0, diff + normalizedResizedRange[0]],
        [1, 0, 0, (normalizedResizedRange[1] - diff) / normalizedResizedRange[1], 0, 0],
        [1, 0, 0, 1, 0, -normalizedResizedRange[0]],
      ]);
    }
    case 2: {
      const targetSize = normalizedSrcRange[1];
      return multiAffines([
        [1, 0, 0, 1, 0, resizedCenter],
        [1, 0, 0, targetSize / normalizedResizedRange[1], 0, 0],
        [1, 0, 0, 1, 0, -resizedCenter],
      ]);
    }
    case 3: {
      const origin = normalizedResizedRange[0] + normalizedResizedRange[1];
      const targetBottomMargin =
        normalizedSrcRange[0] + normalizedSrcRange[1] - (parentDerotatedRange[0] + parentDerotatedRange[1]);
      const resizedBottomMargin = origin - (parentDerotatedResizedRange[0] + parentDerotatedResizedRange[1]);
      const diff = targetBottomMargin - resizedBottomMargin;
      return multiAffines([
        [1, 0, 0, 1, 0, diff + origin],
        [1, 0, 0, (normalizedResizedRange[1] + diff) / normalizedResizedRange[1], 0, 0],
        [1, 0, 0, 1, 0, -origin],
      ]);
    }
    case 4: {
      const targetTopMargin = normalizedSrcRange[0] - parentDerotatedRange[0];
      const resizedTopMargin = normalizedResizedRange[0] - parentDerotatedResizedRange[0];
      const diff = targetTopMargin - resizedTopMargin;
      const targetSize = normalizedSrcRange[1];
      return multiAffines([
        [1, 0, 0, 1, 0, diff + normalizedResizedRange[0]],
        [1, 0, 0, targetSize / normalizedResizedRange[1], 0, 0],
        [1, 0, 0, 1, 0, -normalizedResizedRange[0]],
      ]);
    }
    case 5: {
      const targetTopMargin = normalizedSrcRange[0] - parentDerotatedRange[0];
      const resizedTopMargin = normalizedResizedRange[0] - parentDerotatedResizedRange[0];
      const topDiff = targetTopMargin - resizedTopMargin;

      const origin = normalizedResizedRange[0] + normalizedResizedRange[1];
      const targetBottomMargin =
        normalizedSrcRange[0] + normalizedSrcRange[1] - (parentDerotatedRange[0] + parentDerotatedRange[1]);
      const resizedBottomMargin = origin - (parentDerotatedResizedRange[0] + parentDerotatedResizedRange[1]);
      const bottomDiff = targetBottomMargin - resizedBottomMargin;
      return multiAffines([
        [1, 0, 0, 1, 0, topDiff + normalizedResizedRange[0]],
        [1, 0, 0, (normalizedResizedRange[1] - topDiff + bottomDiff) / normalizedResizedRange[1], 0, 0],
        [1, 0, 0, 1, 0, -normalizedResizedRange[0]],
      ]);
    }
    case 6: {
      const origin = normalizedResizedRange[0] + normalizedResizedRange[1];
      const targetBottomMargin =
        normalizedSrcRange[0] + normalizedSrcRange[1] - (parentDerotatedRange[0] + parentDerotatedRange[1]);
      const resizedBottomMargin = origin - (parentDerotatedResizedRange[0] + parentDerotatedResizedRange[1]);
      const diff = targetBottomMargin - resizedBottomMargin;
      const targetSize = normalizedSrcRange[1];
      return multiAffines([
        [1, 0, 0, 1, 0, diff + origin],
        [1, 0, 0, targetSize / normalizedResizedRange[1], 0, 0],
        [1, 0, 0, 1, 0, -origin],
      ]);
    }
  }
}

function swapSimpleAffineDirection(affine?: AffineMatrix): AffineMatrix | undefined {
  return affine ? [affine[3], 0, 0, affine[0], affine[5], affine[4]] : undefined;
}
