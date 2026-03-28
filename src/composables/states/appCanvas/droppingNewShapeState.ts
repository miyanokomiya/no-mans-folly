import type { AppCanvasState } from "./core";
import { Shape } from "../../../models";
import { AffineMatrix, IRectangle, IVec2, add, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { ShapeComposite, newShapeComposite } from "../../shapeComposite";
import { DocOutput } from "../../../models/document";
import { newShapeRenderer } from "../../shapeRenderer";
import { handleCommonWheel } from "../commons";
import { getSnappableCandidates } from "./commons";
import { renderMovingHighlight } from "./utils/highlight";
import { scaleGlobalAlpha } from "../../../utils/renderer";

interface Option {
  shapes: Shape[];
  docMap?: { [id: string]: DocOutput };
}

export function newDroppingNewShapeState(option: Option): AppCanvasState {
  const shapes = option.shapes;
  let minShapeComposite: ShapeComposite;
  let latestMovingRectP: IVec2; // represents the latest top-left of the moving shapes
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let movingOutlinePoints: IVec2[] | undefined;
  let snappingResult: SnappingResult | undefined;

  function updateMovingRectPByCenter(center: IVec2) {
    latestMovingRectP = sub(center, { x: movingRect.width / 2, y: movingRect.height / 2 });
  }

  return {
    getLabel: () => "DroppingNewShape",
    onStart: (ctx) => {
      ctx.clearAllSelected();
      ctx.startDragging();
      ctx.setCursor("grabbing");

      const shapeComposite = ctx.getShapeComposite();
      const snappableCandidates = getSnappableCandidates(ctx, []);
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableCandidates.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        gridSnapping: ctx.getGrid().getSnappingLines(),
        settings: ctx.getUserSetting(),
      });

      minShapeComposite = newShapeComposite({
        getStruct: shapeComposite.getShapeStruct,
        shapes: shapes,
      });

      movingRect = minShapeComposite.getWrapperRectForShapes(shapes);

      if (shapes.length === 1) {
        movingOutlinePoints = minShapeComposite.getSnappingFeaturePoints(shapes[0]);
      }

      updateMovingRectPByCenter(ctx.getCursorPoint());
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const rectSize = { width: movingRect.width / 2, height: movingRect.height / 2 };
          const targetRect = {
            ...movingRect,
            x: event.data.current.x - rectSize.width,
            y: event.data.current.y - rectSize.height,
          };
          const d = { x: targetRect.x - movingRect.x, y: targetRect.y - movingRect.y };
          const outlinePoints = movingOutlinePoints?.map((p) => add(p, d));

          snappingResult = shapeSnapping.test({ rect: targetRect, outlinePoints }, ctx.getScale());
          const adjustedCurrent = snappingResult ? add(event.data.current, snappingResult.diff) : event.data.current;
          updateMovingRectPByCenter(adjustedCurrent);

          const translate = snappingResult ? add(d, snappingResult.diff) : d;
          const affine: AffineMatrix = [1, 0, 0, 1, translate.x, translate.y];
          const shapeComposite = ctx.getShapeComposite();
          const tmpShapeMap: { [id: string]: Partial<Shape> } = {};
          shapes.forEach((s) => {
            tmpShapeMap[s.id] = minShapeComposite.transformShape(s, affine);
          });
          minShapeComposite = newShapeComposite({
            getStruct: shapeComposite.getShapeStruct,
            shapes,
            tmpShapeMap,
          });

          ctx.redraw();
          return;
        }
        case "pointerup": {
          ctx.addShapes(minShapeComposite.mergedShapes, option.docMap);
          ctx.multiSelectShapes(shapes.map((s) => s.id));
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
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();

      const renderer = newShapeRenderer({
        shapeComposite: minShapeComposite,
        getDocumentMap: () => option.docMap ?? {},
        imageStore: ctx.getImageStore(),
      });
      scaleGlobalAlpha(renderCtx, 0.5, () => {
        renderer.render(renderCtx);
      });

      const v = sub(latestMovingRectP, movingRect);
      renderMovingHighlight(renderCtx, {
        style,
        scale,
        movingRect: {
          x: latestMovingRectP.x,
          y: latestMovingRectP.y,
          width: movingRect.width,
          height: movingRect.height,
        },
        movingOutline: movingOutlinePoints
          ? [{ path: movingOutlinePoints.map((p) => add(p, v)), curves: [] }]
          : undefined,
      });

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
          getTargetShape: (id) =>
            shapeComposite.mergedShapeMap[id]
              ? {
                  highlightPaths: shapeComposite.getHighlightPaths(shapeComposite.mergedShapeMap[id]),
                  wrapperRect: shapeComposite.getWrapperRect(shapeComposite.mergedShapeMap[id]),
                }
              : undefined,
        });
      }
    },
  };
}
