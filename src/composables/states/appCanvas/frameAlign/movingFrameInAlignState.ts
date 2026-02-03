import type { AppCanvasState, AppCanvasStateContext } from "../core";
import { findBetterShapeAt, getClosestShapeByType, ShapeComposite } from "../../../shapeComposite";
import { findexSortFn } from "../../../../utils/commons";
import { AffineMatrix, IVec2, sub } from "okageo";
import { Shape } from "../../../../models";
import { BoundingBox } from "../../../boundingBox";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { AlignHitResult, AlignHandler, newAlignHandler } from "../../../alignHandler";
import { FrameShape, isFrameShape } from "../../../../shapes/frame";
import { FrameAlignGroupShape } from "../../../../shapes/frameGroups/frameAlignGroup";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { getDummyShapeCompositeForFrameAlign } from "../../../frameGroups/frameAlignGroupHandler";
import { getRootShapeIdsByFrame } from "../../../frame";

interface Option {
  boundingBox?: BoundingBox;
  alignBoxId: string;
}

/**
 * This state is supposed to be stacked on "MovingShape".
 * => "startDragging" and other methods aren't called by this state because of that.
 *
 * This state can't leave shapes that are on the target frames at their original locations.
 * => "getPatchByLayouts" doesn't provide that flexibility.
 */
export function newMovingFrameInAlignState(option: Option): AppCanvasState {
  let frameShapes: FrameShape[];
  let movingIds: string[];
  let alignBoxId = option.alignBoxId;
  let alignHandler: AlignHandler;
  let dummyShapeComposite: ShapeComposite;
  let hitResult: AlignHitResult | undefined;
  let diff: IVec2;

  function initHandler(ctx: AppCanvasStateContext) {
    hitResult = undefined;

    const shapeComposite = ctx.getShapeComposite();
    dummyShapeComposite = getDummyShapeCompositeForFrameAlign(shapeComposite);

    alignHandler = newAlignHandler({
      getShapeComposite: () => dummyShapeComposite,
      alignBoxId: alignBoxId,
    });
  }

  return {
    getLabel: () => "MovingFrameInAlign",
    onStart: (ctx) => {
      // Need to use the composite without tmp info to collect shapes on target frames
      const staticShapeComposite = ctx.getShapeComposite().getShapeCompositeWithoutTmpInfo();
      const shapeMap = staticShapeComposite.shapeMap;
      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      frameShapes = selectedIds
        .map((id) => shapeMap[id])
        .filter(isFrameShape)
        .sort(findexSortFn);

      const movingIdSet = new Set(selectedIds);
      frameShapes.forEach((s) => {
        getRootShapeIdsByFrame(staticShapeComposite, s).forEach((id) => movingIdSet.add(id));
      });
      movingIds = Array.from(movingIdSet);

      initHandler(ctx);
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          if (event.data.ctrl) return { type: "break" };

          const shapeComposite = ctx.getShapeComposite();
          const scope = shapeComposite.getSelectionScope(frameShapes[0]);
          const shapeAtPoint = findBetterShapeAt(
            shapeComposite,
            event.data.current,
            scope,
            frameShapes.map((s) => s.id),
          );
          if (!shapeAtPoint) return { type: "break" };

          const alignBoxShape = getClosestShapeByType<FrameAlignGroupShape>(
            shapeComposite,
            shapeAtPoint.id,
            "frame_align_group",
          );
          if (!alignBoxShape) {
            return { type: "break" };
          } else if (alignBoxShape.id !== alignBoxId) {
            // Switch to the closest align box shape
            alignBoxId = alignBoxShape.id;
            initHandler(ctx);
          }

          diff = sub(event.data.current, event.data.startAbs);
          const affine: AffineMatrix = [1, 0, 0, 1, diff.x, diff.y];
          const shapeIdSet = new Set(movingIds);
          ctx.setTmpShapeMap(
            shapeComposite.getAllTransformTargets(movingIds).reduce<Record<string, Partial<Shape>>>((p, { id }) => {
              const s = shapeComposite.shapeMap[id];
              p[s.id] = { ...shapeComposite.transformShape(s, affine) };
              if (shapeIdSet.has(id)) {
                // Make the target shapes translucent
                p[s.id].alpha = (s.alpha ?? 1) * 0.5;
              }
              return p;
            }, {}),
          );

          const result = alignHandler.hitTest(event.data.current);
          hitResult = result;
          ctx.redraw();
          return;
        }
        case "pointerup": {
          if (!hitResult || event.data.options.ctrl) return ctx.states.newSelectionHubState;

          const shapeComposite = ctx.getShapeComposite();
          const findexTo = hitResult.findexBetween[1];
          let findex = generateKeyBetweenAllowSame(hitResult.findexBetween[0], findexTo);
          const patch = frameShapes.reduce<{ [id: string]: Partial<Shape> }>((p, s) => {
            p[s.id] = { parentId: alignBoxId, findex };
            findex = generateKeyBetweenAllowSame(findex, findexTo);
            return p;
          }, {});
          const layoutPatch = getPatchByLayouts(shapeComposite, { update: patch });
          ctx.patchShapes(layoutPatch);
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
        case "shape-updated": {
          if (alignHandler.isAlignChanged(event.data.keys)) {
            initHandler(ctx);
          }
          return;
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      const style = ctx.getStyleScheme();
      alignHandler.render(renderCtx, style, ctx.getScale(), hitResult);
    },
  };
}
