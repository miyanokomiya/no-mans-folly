import type { AppCanvasState } from "../core";
import { handleHistoryEvent } from "../commons";
import { LineShape, getEdges, isLineShape } from "../../../../shapes/line";
import { IVec2, add, getRadian, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { newSelectionHubState } from "../selectionHubState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { ShapeSnapping, SnappingResult, newShapeSnapping, renderSnappingResult } from "../../../shapeSnapping";
import { TAU, getRotateFn } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { ArcCurveControl } from "../../../../models";

interface Option {
  lineShape: LineShape;
  index: number;
  p: IVec2;
}

export function newMovingLineArcState(option: Option): AppCanvasState {
  const edge = getEdges(option.lineShape)[option.index];
  const rotateFn = getRotateFn(getRadian(edge[1], edge[0]));
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;

  return {
    getLabel: () => "MovingLineArc",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;

      const snappableLines = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => isLineShape(s)),
        ctx.getViewRect(),
      );
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableLines.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      const d = rotateFn(sub(option.p, edge[0]), true);
      const curves = option.lineShape.curves?.concat() ?? [];
      curves[option.index] = { d };
      ctx.setTmpShapeMap(
        getPatchAfterLayouts(ctx.getShapeComposite(), {
          update: { [option.lineShape.id]: { curves } as Partial<LineShape> },
        }),
      );
    },
    onEnd: (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCommandExams();
    },
    handleEvent: (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const point = event.data.current;

          snappingResult = event.data.ctrl ? undefined : shapeSnapping.testPoint(point);
          const p = snappingResult ? add(point, snappingResult.diff) : point;
          let d = rotateFn(sub(p, edge[0]), true);
          // Snap to none arc point.
          if (!event.data.ctrl && Math.abs(d.y) < 10 * ctx.getScale()) {
            d = { x: d.x, y: 0 };
          }

          const curves = option.lineShape.curves?.concat() ?? [];
          curves[option.index] = { d };
          ctx.setTmpShapeMap(
            getPatchAfterLayouts(ctx.getShapeComposite(), {
              update: { [option.lineShape.id]: { curves } as Partial<LineShape> },
            }),
          );
          return;
        }
        case "pointerup": {
          const tmpMap = ctx.getTmpShapeMap();
          if (Object.keys(tmpMap).length > 0) {
            ctx.patchShapes(tmpMap);
          }
          return newSelectionHubState;
        }
        case "selection": {
          return newSelectionHubState;
        }
        case "history":
          handleHistoryEvent(ctx, event);
          return newSelectionHubState;
        default:
          return;
      }
    },
    render(ctx, renderCtx) {
      const scale = ctx.getScale();
      const style = ctx.getStyleScheme();
      const vertexSize = 8 * scale;
      applyFillStyle(renderCtx, { color: style.selectionPrimary });

      const line: LineShape = { ...option.lineShape, ...ctx.getTmpShapeMap()[option.lineShape.id] };
      const d = (line.curves?.[option.index] as ArcCurveControl | undefined)?.d ?? { x: 0, y: 0 };
      const p = add(rotateFn(d), edge[0]);

      renderCtx.beginPath();
      renderCtx.arc(p.x, p.y, vertexSize, 0, TAU);
      renderCtx.fill();

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style: ctx.getStyleScheme(),
          scale: ctx.getScale(),
          result: snappingResult,
        });
      }
    },
  };
}
