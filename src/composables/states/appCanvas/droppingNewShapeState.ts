import type { AppCanvasState } from "./core";
import { Shape } from "../../../models";
import { AffineMatrix, IRectangle, IVec2, add, sub } from "okageo";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../shapeSnapping";
import { ShapeComposite, newShapeComposite } from "../../shapeComposite";
import { DocOutput } from "../../../models/document";
import { newShapeRenderer } from "../../shapeRenderer";
import { handleCommonWheel } from "../commons";
import { getSnappableCandidates } from "./commons";

interface Option {
  shapes: Shape[];
  docMap?: { [id: string]: DocOutput };
}

export function newDroppingNewShapeState(option: Option): AppCanvasState {
  const shapes = option.shapes;
  let minShapeComposite: ShapeComposite;
  let p: IVec2; // represents the center of the shapes
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingResult: SnappingResult | undefined;

  function updateP(topLeft: IVec2) {
    const rectSize = { width: movingRect.width / 2, height: movingRect.height / 2 };
    p = sub(topLeft, { x: rectSize.width, y: rectSize.height });
  }

  function getDiff(): IVec2 {
    return sub(p, movingRect);
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
      updateP(ctx.getCursorPoint());
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const rectSize = { width: movingRect.width / 2, height: movingRect.height / 2 };

          snappingResult = shapeSnapping.test(
            {
              ...movingRect,
              x: event.data.current.x - rectSize.width,
              y: event.data.current.y - rectSize.height,
            },
            undefined,
            ctx.getScale(),
          );
          const adjustedCurrent = snappingResult ? add(event.data.current, snappingResult.diff) : event.data.current;

          updateP(adjustedCurrent);
          ctx.redraw();
          return;
        }
        case "pointerup": {
          const diff = getDiff();
          const affine: AffineMatrix = [1, 0, 0, 1, diff.x, diff.y];
          ctx.addShapes(
            shapes.map((s) => ({ ...s, ...minShapeComposite.transformShape(s, affine) })),
            option.docMap,
          );
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
      const diff = getDiff();
      const renderer = newShapeRenderer({
        shapeComposite: minShapeComposite,
        getDocumentMap: () => option.docMap ?? {},
        imageStore: ctx.getImageStore(),
      });
      renderCtx.save();
      renderCtx.translate(diff.x, diff.y);
      renderer.render(renderCtx);
      renderCtx.restore();

      if (snappingResult) {
        const shapeComposite = ctx.getShapeComposite();
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
          getTargetRect: (id) => shapeComposite.getWrapperRect(shapeComposite.shapeMap[id]),
        });
      }
    },
  };
}
