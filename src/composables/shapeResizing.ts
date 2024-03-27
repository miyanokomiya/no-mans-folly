import {
  AffineMatrix,
  IDENTITY_AFFINE,
  IRectangle,
  IVec2,
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

  walkTreeWithValue<
    | {
        affine: AffineMatrix;
        parentResizedRotationAffine: AffineMatrix;
        parentDerotationAffine: AffineMatrix;
        parentDerotationResizedAffine: AffineMatrix;
        parentDerotatedRect: IRectangle;
        parentDerotatedResizedRect: IRectangle;
      }
    | { inheritedAffine: AffineMatrix }
    | undefined
  >(
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
      const center = getCenter(localPolygon[0], localPolygon[2]);

      const rowResizedInfo = rowResizedInfoMap[shape.id];
      const resizedLocalPolygon = localPolygon.map((p) => applyAffine(resizingAffine, p));
      const resizedCenter = getCenter(resizedLocalPolygon[0], resizedLocalPolygon[2]);

      if (!data) {
        ret[node.id] = rowResizedInfo.patch;
        if (!isGroupShape(shape)) return;

        const rotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, shape.rotation);

        const derotationAffine = geometry.getRotatedAtAffine(center, -shape.rotation);
        const derotationResizedAffine = geometry.getRotatedAtAffine(resizedCenter, -shape.rotation);

        const derotatedRect = minShapeComposite.getWrapperRect({ ...shape, rotation: 0 });
        const derotatedResizedRect = getOuterRectangle([
          resizedLocalPolygon.map((p) => applyAffine(derotationResizedAffine, p)),
        ]);

        return {
          affine: resizingAffine,
          parentResizedRotationAffine: rotationResizedAffine,
          parentDerotationAffine: derotationAffine,
          parentDerotationResizedAffine: derotationResizedAffine,
          parentDerotatedRect: derotatedRect,
          parentDerotatedResizedRect: derotatedResizedRect,
        };
      }

      const normalizedSrcRect = getOuterRectangle([
        localPolygon.map((p) => applyAffine(data.parentDerotationAffine, p)),
      ]);

      const normalizedResizedRect = getOuterRectangle([
        resizedLocalPolygon.map((p) => applyAffine(data.parentDerotationResizedAffine, p)),
      ]);

      const adjustmentAffines: AffineMatrix[] = [];

      const verticalAdjustmentAffine = getVerticalConstraintAdjustmentAffine(
        shape.gcV,
        normalizedSrcRect,
        normalizedResizedRect,
        resizedCenter,
        data.parentDerotatedRect,
        data.parentDerotatedResizedRect,
      );
      if (verticalAdjustmentAffine) {
        adjustmentAffines.push(verticalAdjustmentAffine);
      }

      const adjustmentAffine: AffineMatrix =
        adjustmentAffines.length === 0
          ? IDENTITY_AFFINE
          : multiAffines([data.parentResizedRotationAffine, ...adjustmentAffines, data.parentDerotationResizedAffine]);

      const adjustmentPatch = resizedComposite.transformShape(rowResizedInfo.shape, adjustmentAffine);

      ret[node.id] = { ...rowResizedInfo.patch, ...adjustmentPatch };

      const adjustedLocalPolygon = resizedLocalPolygon.map((p) => applyAffine(adjustmentAffine, p));
      const adjustedCenter = getCenter(adjustedLocalPolygon[0], adjustedLocalPolygon[2]);

      if (isGroupShape(shape)) {
        const rotationResizedAffine = geometry.getRotatedAtAffine(adjustedCenter, shape.rotation);

        const derotationAffine = geometry.getRotatedAtAffine(center, -shape.rotation);
        const derotationResizedAffine = geometry.getRotatedAtAffine(adjustedCenter, -shape.rotation);

        const derotatedRect = minShapeComposite.getWrapperRect({ ...shape, rotation: 0 });
        const derotatedResizedRect = getOuterRectangle([
          adjustedLocalPolygon.map((p) => applyAffine(derotationResizedAffine, p)),
        ]);

        return {
          affine: resizingAffine,
          parentResizedRotationAffine: rotationResizedAffine,
          parentDerotationResizedAffine: derotationResizedAffine,
          parentDerotatedRect: derotatedRect,
          parentDerotatedResizedRect: derotatedResizedRect,
          parentDerotationAffine: derotationAffine,
        };
      }

      return { inheritedAffine: multiAffines([adjustmentAffine, resizingAffine]) };
    },
    undefined,
  );

  return ret;
}

function getVerticalConstraintAdjustmentAffine(
  gcV: GroupConstraint | undefined,
  normalizedSrcRect: IRectangle,
  normalizedResizedRect: IRectangle,
  resizedCenter: IVec2,
  parentDerotatedRect: IRectangle,
  parentDerotatedResizedRect: IRectangle,
): AffineMatrix | undefined {
  switch (gcV) {
    case 1: {
      const targetTopMargin = normalizedSrcRect.y - parentDerotatedRect.y;
      const resizedTopMargin = normalizedResizedRect.y - parentDerotatedResizedRect.y;
      const diff = targetTopMargin - resizedTopMargin;
      return multiAffines([
        [1, 0, 0, 1, 0, diff + normalizedResizedRect.y],
        [1, 0, 0, (normalizedResizedRect.height - diff) / normalizedResizedRect.height, 0, 0],
        [1, 0, 0, 1, 0, -normalizedResizedRect.y],
      ]);
    }
    case 2: {
      const targetHeight = normalizedSrcRect.height;
      return multiAffines([
        [1, 0, 0, 1, 0, resizedCenter.y],
        [1, 0, 0, targetHeight / normalizedResizedRect.height, 0, 0],
        [1, 0, 0, 1, 0, -resizedCenter.y],
      ]);
    }
    case 3: {
      const origin = normalizedResizedRect.y + normalizedResizedRect.height;
      const targetBottomMargin =
        normalizedSrcRect.y + normalizedSrcRect.height - (parentDerotatedRect.y + parentDerotatedRect.height);
      const resizedBottomMargin = origin - (parentDerotatedResizedRect.y + parentDerotatedResizedRect.height);
      const diff = targetBottomMargin - resizedBottomMargin;
      return multiAffines([
        [1, 0, 0, 1, 0, diff + origin],
        [1, 0, 0, (normalizedResizedRect.height + diff) / normalizedResizedRect.height, 0, 0],
        [1, 0, 0, 1, 0, -origin],
      ]);
    }
    case 4: {
      const targetTopMargin = normalizedSrcRect.y - parentDerotatedRect.y;
      const resizedTopMargin = normalizedResizedRect.y - parentDerotatedResizedRect.y;
      const diff = targetTopMargin - resizedTopMargin;
      const targetHeight = normalizedSrcRect.height;
      return multiAffines([
        [1, 0, 0, 1, 0, diff + normalizedResizedRect.y],
        [1, 0, 0, targetHeight / normalizedResizedRect.height, 0, 0],
        [1, 0, 0, 1, 0, -normalizedResizedRect.y],
      ]);
    }
    case 5: {
      const targetTopMargin = normalizedSrcRect.y - parentDerotatedRect.y;
      const resizedTopMargin = normalizedResizedRect.y - parentDerotatedResizedRect.y;
      const topDiff = targetTopMargin - resizedTopMargin;

      const origin = normalizedResizedRect.y + normalizedResizedRect.height;
      const targetBottomMargin =
        normalizedSrcRect.y + normalizedSrcRect.height - (parentDerotatedRect.y + parentDerotatedRect.height);
      const resizedBottomMargin = origin - (parentDerotatedResizedRect.y + parentDerotatedResizedRect.height);
      const bottomDiff = targetBottomMargin - resizedBottomMargin;
      return multiAffines([
        [1, 0, 0, 1, 0, topDiff + normalizedResizedRect.y],
        [1, 0, 0, (normalizedResizedRect.height - topDiff + bottomDiff) / normalizedResizedRect.height, 0, 0],
        [1, 0, 0, 1, 0, -normalizedResizedRect.y],
      ]);
    }
    case 6: {
      const origin = normalizedResizedRect.y + normalizedResizedRect.height;
      const targetBottomMargin =
        normalizedSrcRect.y + normalizedSrcRect.height - (parentDerotatedRect.y + parentDerotatedRect.height);
      const resizedBottomMargin = origin - (parentDerotatedResizedRect.y + parentDerotatedResizedRect.height);
      const diff = targetBottomMargin - resizedBottomMargin;
      const targetHeight = normalizedSrcRect.height;
      return multiAffines([
        [1, 0, 0, 1, 0, diff + origin],
        [1, 0, 0, targetHeight / normalizedResizedRect.height, 0, 0],
        [1, 0, 0, 1, 0, -origin],
      ]);
    }
  }
}
