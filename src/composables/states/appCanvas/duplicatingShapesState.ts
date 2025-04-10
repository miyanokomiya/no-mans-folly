import type { AppCanvasState } from "./core";
import { Shape } from "../../../models";
import { AffineMatrix, IRectangle, add, moveRect, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { DocOutput } from "../../../models/document";
import { newShapeRenderer } from "../../shapeRenderer";
import { getAllBranchIds, getTree } from "../../../utils/tree";
import { ShapeComposite, newShapeComposite } from "../../shapeComposite";
import { handleCommonWheel } from "../commons";
import { scaleGlobalAlpha } from "../../../utils/renderer";
import { duplicateShapes } from "../../../shapes/utils/duplicator";
import { getSnappableCandidates } from "./commons";

// Add extra distance to make duplicated shapes' existence clear.
const EXTRA_DISTANCE = -10;

export function newDuplicatingShapesState(): AppCanvasState {
  let duplicated: { shapes: Shape[]; docMap: { [id: string]: DocOutput } };
  let duplicatedShapeComposite: ShapeComposite;
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "DuplicatingShapes",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCursor("grabbing");

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const snappableCandidates = getSnappableCandidates(ctx, []);

      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        gridSnapping: ctx.getGrid().getSnappingLines(),
        settings: ctx.getUserSetting(),
      });

      const selectedIds = Object.keys(ctx.getSelectedShapeIdMap());
      // Collect all related shape ids
      const targetIds = getAllBranchIds(getTree(Object.values(shapeMap)), selectedIds);

      const docMap = ctx.getDocumentMap();
      duplicated = duplicateShapes(
        ctx.getShapeStruct,
        targetIds.map((id) => shapeMap[id]),
        targetIds.filter((id) => !!docMap[id]).map((id) => [id, docMap[id]]),
        ctx.generateUuid,
        ctx.createLastIndex(),
        new Set(Object.keys(shapeMap)),
      );
      duplicatedShapeComposite = newShapeComposite({
        getStruct: shapeComposite.getShapeStruct,
        shapes: duplicated.shapes,
      });
      movingRect = duplicatedShapeComposite.getWrapperRectForShapes(duplicated.shapes);

      ctx.clearAllSelected();
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const extraDistance = EXTRA_DISTANCE * ctx.getScale();
          const d = sub(
            { x: event.data.current.x + extraDistance, y: event.data.current.y + extraDistance },
            event.data.startAbs,
          );
          snappingResult = event.data.ctrl
            ? undefined
            : shapeSnapping.test(moveRect(movingRect, d), undefined, ctx.getScale());
          const translate = snappingResult ? add(d, snappingResult.diff) : d;
          const affine: AffineMatrix = [1, 0, 0, 1, translate.x, translate.y];
          const tmpShapeMap: { [id: string]: Partial<Shape> } = {};
          duplicated.shapes.forEach((s) => {
            tmpShapeMap[s.id] = duplicatedShapeComposite.transformShape(s, affine);
          });
          duplicatedShapeComposite = newShapeComposite({
            getStruct: duplicatedShapeComposite.getShapeStruct,
            shapes: duplicated.shapes,
            tmpShapeMap,
          });
          ctx.redraw();
          return;
        }
        case "pointerup": {
          const moved = duplicatedShapeComposite.mergedShapes;
          ctx.addShapes(moved, duplicated.docMap);
          ctx.multiSelectShapes(moved.map((s) => s.id));
          return ctx.states.newSelectionHubState;
        }
        case "wheel":
          handleCommonWheel(ctx, event);
          return;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const renderer = newShapeRenderer({
        shapeComposite: duplicatedShapeComposite,
        getDocumentMap: () => duplicated.docMap,
        imageStore: ctx.getImageStore(),
      });
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderer.render(renderCtx);
      });

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) =>
            shapeComposite.mergedShapeMap[id]
              ? shapeComposite.getWrapperRect(shapeComposite.mergedShapeMap[id])
              : undefined,
        });
      }
    },
  };
}
