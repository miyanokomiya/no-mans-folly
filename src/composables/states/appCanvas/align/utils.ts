import { EntityPatchInfo, Shape } from "../../../../models";
import { AlignBoxShape } from "../../../../shapes/align/alignBox";
import { AlignBoxHitResult } from "../../../alignHandler";
import { newBoundingBox } from "../../../boundingBox";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { TransitionValue } from "../../core";
import { AppCanvasStateContext } from "../core";
import { newResizingState } from "../resizingState";
import { newAlignBoxGapState } from "./alignBoxGapState";
import { newAlignBoxPaddingState } from "./alignBoxPaddingState";

export function handleAlignBoxHitResult(
  ctx: AppCanvasStateContext,
  targetShape: AlignBoxShape,
  alignBoxHitResult: AlignBoxHitResult,
): TransitionValue<AppCanvasStateContext> {
  const shapeComposite = ctx.getShapeComposite();

  switch (alignBoxHitResult.type) {
    case "padding-top":
    case "padding-right":
    case "padding-bottom":
    case "padding-left": {
      const type = alignBoxHitResult.type;
      return () => newAlignBoxPaddingState({ type, alignBoxId: targetShape.id });
    }
    case "gap-r":
    case "gap-c": {
      const type = alignBoxHitResult.type;
      return () => newAlignBoxGapState({ type, alignBoxId: targetShape.id });
    }
    case "resize-by-segment": {
      const index = alignBoxHitResult.index;
      const boundingBox = newBoundingBox({
        path: ctx.getShapeComposite().getLocalRectPolygon(targetShape),
        locked: targetShape.locked,
        noExport: targetShape.noExport,
      });
      return () =>
        newResizingState({
          boundingBox,
          hitResult: { type: "segment", index },
          resizeFn: (_, affine) => {
            return { [targetShape.id]: shapeComposite.transformShape(targetShape, affine) };
          },
          hideBoundingBox: true,
        });
    }
  }

  const layoutPatch = getPatchByAlignBoxHitResult(ctx, targetShape, alignBoxHitResult);
  if (layoutPatch) {
    ctx.patchShapes(layoutPatch);
  }
}

export function getPatchByAlignBoxHitResult(
  ctx: AppCanvasStateContext,
  targetShape: AlignBoxShape,
  alignBoxHitResult: AlignBoxHitResult,
): EntityPatchInfo<Shape>["update"] {
  const shapeComposite = ctx.getShapeComposite();

  let patch: Partial<AlignBoxShape> | undefined;
  switch (alignBoxHitResult.type) {
    case "direction": {
      const maxSize = Math.max(targetShape.width, targetShape.height);
      patch = {
        direction: alignBoxHitResult.direction,
        width: maxSize,
        height: maxSize,
      };
      break;
    }
    case "align-items": {
      if (alignBoxHitResult.value !== targetShape.alignItems) {
        patch = { alignItems: alignBoxHitResult.value };
      }
      break;
    }
    case "justify-content": {
      if (alignBoxHitResult.value !== targetShape.justifyContent) {
        patch = { justifyContent: alignBoxHitResult.value };
      }
      break;
    }
    case "optimize-width": {
      patch = { baseWidth: undefined };
      break;
    }
    case "optimize-height": {
      patch = { baseHeight: undefined };
      break;
    }
  }

  if (patch) {
    return getPatchByLayouts(shapeComposite, {
      update: { [targetShape.id]: patch },
    });
  }
}
