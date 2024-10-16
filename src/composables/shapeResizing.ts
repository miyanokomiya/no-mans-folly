import {
  AffineMatrix,
  IRectangle,
  IVec2,
  MINVALUE,
  applyAffine,
  getCenter,
  getOuterRectangle,
  multiAffines,
} from "okageo";
import { GroupConstraint, Shape } from "../models";
import * as geometry from "../utils/geometry";
import { walkTreeWithValue } from "../utils/tree";
import { isGroupShape } from "../shapes/group";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";

type TreeStepGroupValue = {
  affine: AffineMatrix;
  parentRotationResiezedAffine: AffineMatrix;
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
  // Prepare minimal shape composite to remove any effect of temporary shapes.
  const shapeMap = shapeComposite.shapeMap;
  const targetTrees = targetIds.map((id) => shapeComposite.mergedShapeTreeMap[id]);
  const allBranchIds = shapeComposite.getAllBranchMergedShapes(targetIds).map((s) => s.id);
  const allBranchShsapes = allBranchIds.map((id) => shapeMap[id]);
  const minShapeComposite = newShapeComposite({
    getStruct: shapeComposite.getShapeStruct,
    shapes: allBranchShsapes,
  });

  // Gather current and resized bounds information of all shapes in advance.
  // Certain shape types, in particular group shape, need whole shape tree to derive their bounds.
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

  walkTreeWithValue<TreeStepGroupValue | { affine: AffineMatrix } | undefined>(
    targetTrees,
    (node, _, data) => {
      const shape = shapeMap[node.id];
      const localPolygon = srcInfoMap[shape.id].localPolygon;
      const rowResizedInfo = rowResizedInfoMap[shape.id];

      if (!data) {
        ret[node.id] = rowResizedInfo.patch;
        if (!isGroupShape(shape)) return;

        return createTreeStepGroupValue(affine, shape, localPolygon, rowResizedInfo.localPolygon);
      }

      const resizingAffine = data.affine;

      if (!("parentRotationResiezedAffine" in data)) {
        const patch = minShapeComposite.transformShape(shape, resizingAffine);
        ret[node.id] = patch;
        return data;
      }

      const resizedLocalPolygon = localPolygon.map((p) => applyAffine(resizingAffine, p));

      const normalizedSrcRect = getOuterRectangle([
        localPolygon.map((p) => applyAffine(data.parentDerotationAffine, p)),
      ]);

      const normalizedResizedRect = getOuterRectangle([
        resizedLocalPolygon.map((p) => applyAffine(data.parentDerotationResizedAffine, p)),
      ]);

      const constraintAffine = getConstraintAdjustmentAffine(
        shape.gcV,
        shape.gcH,
        normalizedSrcRect,
        normalizedResizedRect,
        data.parentDerotatedRect,
        data.parentDerotatedResizedRect,
      );

      if (!constraintAffine) {
        const patch = minShapeComposite.transformShape(shape, resizingAffine);
        ret[node.id] = patch;
        if (!isGroupShape(shape)) return { affine: resizingAffine };

        return createTreeStepGroupValue(resizingAffine, shape, localPolygon, resizedLocalPolygon);
      }

      const adjustmentAffine = multiAffines([
        data.parentRotationResiezedAffine,
        constraintAffine,
        data.parentDerotationResizedAffine,
      ]);

      const adjustedResizedAffine = multiAffines([adjustmentAffine, resizingAffine]);
      ret[node.id] = minShapeComposite.transformShape(shape, adjustedResizedAffine);
      if (!isGroupShape(shape)) return { affine: adjustedResizedAffine };

      const adjustedLocalPolygon = resizedLocalPolygon.map((p) => applyAffine(adjustmentAffine, p));
      return createTreeStepGroupValue(adjustedResizedAffine, shape, localPolygon, adjustedLocalPolygon);
    },
    undefined,
  );

  return ret;
}

function createTreeStepGroupValue(
  affine: AffineMatrix,
  shape: Shape,
  localPolygon: IVec2[],
  resizedLocalPolygon: IVec2[],
): TreeStepGroupValue {
  const srcCenter = getCenter(localPolygon[0], localPolygon[2]);
  const resizedCenter = getCenter(resizedLocalPolygon[0], resizedLocalPolygon[2]);
  const rotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, shape.rotation);

  const derotationAffine = geometry.getRotatedAtAffine(srcCenter, -shape.rotation);
  const derotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, -shape.rotation);

  const derotatedRect = getOuterRectangle([localPolygon.map((p) => applyAffine(derotationAffine, p))]);
  const derotatedResizedRect = getOuterRectangle([
    resizedLocalPolygon.map((p) => applyAffine(derotationResizedAffine, p)),
  ]);

  return {
    affine,
    parentRotationResiezedAffine: rotationResizedAffine,
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
  parentDerotatedRect: IRectangle,
  parentDerotatedResizedRect: IRectangle,
): AffineMatrix | undefined {
  const vAffine = ignoreIdentityAffine(
    getVerticalConstraintAdjustmentAffine(
      gcV,
      [normalizedSrcRect.y, normalizedSrcRect.height],
      [normalizedResizedRect.y, normalizedResizedRect.height],
      [parentDerotatedRect.y, parentDerotatedRect.height],
      [parentDerotatedResizedRect.y, parentDerotatedResizedRect.height],
    ),
  );

  const hAffine = swapSimpleAffineDirection(
    ignoreIdentityAffine(
      getVerticalConstraintAdjustmentAffine(
        gcH,
        [normalizedSrcRect.x, normalizedSrcRect.width],
        [normalizedResizedRect.x, normalizedResizedRect.width],
        [parentDerotatedRect.x, parentDerotatedRect.width],
        [parentDerotatedResizedRect.x, parentDerotatedResizedRect.width],
      ),
    ),
  );

  if (vAffine && hAffine) {
    return multiAffines([vAffine, hAffine]);
  } else {
    return vAffine || hAffine;
  }
}

type RectRange = [from: number, size: number];

function ignoreIdentityAffine(affine?: AffineMatrix): AffineMatrix | undefined {
  if (!affine) return;
  return geometry.isIdentityAffine(affine) ? undefined : affine;
}

function getVerticalConstraintAdjustmentAffine(
  gcV: GroupConstraint | undefined,
  normalizedSrcRange: RectRange,
  normalizedResizedRange: RectRange,
  parentDerotatedRange: RectRange,
  parentDerotatedResizedRange: RectRange,
): AffineMatrix | undefined {
  switch (gcV) {
    case 1: {
      const targetTopMargin = normalizedSrcRange[0] - parentDerotatedRange[0];
      const resizedTopMargin = normalizedResizedRange[0] - parentDerotatedResizedRange[0];
      const diff = targetTopMargin - resizedTopMargin;

      if (Math.abs(normalizedResizedRange[1]) < MINVALUE) return [1, 0, 0, 1, 0, diff];

      return multiAffines([
        [1, 0, 0, 1, 0, diff + normalizedResizedRange[0]],
        [1, 0, 0, (normalizedResizedRange[1] - diff) / normalizedResizedRange[1], 0, 0],
        [1, 0, 0, 1, 0, -normalizedResizedRange[0]],
      ]);
    }
    case 2: {
      const center = normalizedSrcRange[0] + normalizedSrcRange[1] / 2;
      const resizedCenter = normalizedResizedRange[0] + normalizedResizedRange[1] / 2;
      const centerRate = (center - parentDerotatedRange[0]) / parentDerotatedRange[1];
      const targetCenter = parentDerotatedResizedRange[0] + parentDerotatedResizedRange[1] * centerRate;
      const targetSize = normalizedSrcRange[1];

      if (Math.abs(normalizedResizedRange[1]) < MINVALUE) return [1, 0, 0, 1, 0, targetCenter - resizedCenter];

      return multiAffines([
        [1, 0, 0, 1, 0, targetCenter],
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

      if (Math.abs(normalizedResizedRange[1]) < MINVALUE) return [1, 0, 0, 1, 0, diff];

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

      if (Math.abs(normalizedResizedRange[1]) < MINVALUE) return [1, 0, 0, 1, 0, diff];

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

      if (Math.abs(normalizedResizedRange[1]) < MINVALUE) return [1, 0, 0, 1, 0, topDiff];

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

      if (Math.abs(normalizedResizedRange[1]) < MINVALUE) return [1, 0, 0, 1, 0, diff];

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
