import type { AppCanvasState } from "../core";
import { LineShape, getEdges } from "../../../../shapes/line";
import { IVec2, add, getCenter, getRadian, rotate, sub } from "okageo";
import { applyFillStyle } from "../../../../utils/fillStyle";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { TAU, getRotateFn } from "../../../../utils/geometry";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { ArcCurveControl } from "../../../../models";
import {
  newVectorSnapping,
  renderVectorSnappingResult,
  VectorSnapping,
  VectorSnappingResult,
} from "../../../vectorSnapping";
import { applyStrokeStyle } from "../../../../utils/strokeStyle";
import { applyPath } from "../../../../utils/renderer";

interface Option {
  lineShape: LineShape;
  index: number;
  p: IVec2;
}

export function newMovingLineArcState(option: Option): AppCanvasState {
  const edge = getEdges(option.lineShape)[option.index];
  const rotateFn = getRotateFn(getRadian(edge[1], edge[0]));
  let shapeSnapping: VectorSnapping;
  let snappingResult: VectorSnappingResult | undefined;

  return {
    getLabel: () => "MovingLineArc",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;

      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => s.id !== option.lineShape.id),
        ctx.getViewRect(),
      );
      shapeSnapping = newVectorSnapping({
        origin: getCenter(edge[1], edge[0]),
        vector: rotate(sub(edge[1], edge[0]), -Math.PI / 2),
        snappableShapes,
        gridSnapping: ctx.getGrid().getSnappingLines(),
        getShapeStruct: shapeComposite.getShapeStruct,
        snappableOrigin: true,
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

          snappingResult = event.data.ctrl ? undefined : shapeSnapping.hitTest(point, ctx.getScale());
          const p = snappingResult?.p ?? point;
          const d = rotateFn(sub(p, edge[0]), true);

          const curves = option.lineShape.curves?.concat() ?? [];
          curves[option.index] = d.y !== 0 ? { d } : undefined;
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
          return ctx.states.newSelectionHubState;
        }
        case "selection": {
          return ctx.states.newSelectionHubState;
        }
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
      const p = add(rotateFn({ x: 0, y: d.y }), getCenter(edge[0], edge[1]));

      renderCtx.beginPath();
      renderCtx.arc(p.x, p.y, vertexSize, 0, TAU);
      renderCtx.fill();

      if (snappingResult) {
        const style = ctx.getStyleScheme();
        const scale = ctx.getScale();

        if (snappingResult.snapped === "origin") {
          applyStrokeStyle(renderCtx, { color: style.selectionSecondaly, width: 2 * scale });
          renderCtx.beginPath();
          applyPath(renderCtx, edge);
          renderCtx.stroke();
        }

        renderVectorSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
        });
      }
    },
  };
}
