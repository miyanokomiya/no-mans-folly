import type { AppCanvasState } from "../core";
import { LineShape, getEdges } from "../../../../shapes/line";
import { IVec2, add, getCenter, getRadian, isSame, rotate, sub } from "okageo";
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
import { fillArray } from "../../../../utils/commons";
import { newCoordinateRenderer } from "../../../coordinateRenderer";
import { isArcControl } from "../../../../utils/path";
import { newPreserveAttachmentHandler, PreserveAttachmentHandler } from "../../../lineAttachmentHandler";

interface Option {
  lineShape: LineShape;
  index: number;
  p: IVec2;
}

export function newMovingLineArcState(option: Option): AppCanvasState {
  const edge = getEdges(option.lineShape)[option.index];

  const zeroEdge = isSame(edge[0], edge[1]);
  const currentCurve = option.lineShape.curves?.[option.index];
  const edgeRotation = zeroEdge
    ? isArcControl(currentCurve)
      ? getRadian(currentCurve.d) + Math.PI / 2
      : 0
    : getRadian(edge[1], edge[0]);

  const rotateFn = getRotateFn(edgeRotation);
  let shapeSnapping: VectorSnapping;
  let snappingResult: VectorSnappingResult | undefined;
  let preserveAttachmentHandler: PreserveAttachmentHandler;
  const coordinateRenderer = newCoordinateRenderer({ coord: option.p });

  return {
    getLabel: () => "MovingLineArc",
    onStart: (ctx) => {
      ctx.startDragging();

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;

      const snappableShapes = shapeComposite.getShapesOverlappingRect(
        Object.values(shapeMap).filter((s) => s.id !== option.lineShape.id),
        ctx.getViewRect(),
      );

      shapeSnapping = newVectorSnapping({
        origin: getCenter(edge[1], edge[0]),
        vector: zeroEdge
          ? rotate({ x: 1, y: 0 }, edgeRotation - Math.PI / 2)
          : rotate(sub(edge[1], edge[0]), -Math.PI / 2),
        snappableShapes,
        gridSnapping: ctx.getGrid().getSnappingLines(),
        getShapeStruct: shapeComposite.getShapeStruct,
        snappableOrigin: true,
      });

      const d = zeroEdge ? sub(option.p, edge[0]) : rotateFn(sub(option.p, edge[0]), true);
      const curves = fillArray(option.index + 1, undefined, option.lineShape.curves);
      curves[option.index] = { d };
      ctx.setTmpShapeMap(
        getPatchAfterLayouts(ctx.getShapeComposite(), {
          update: { [option.lineShape.id]: { curves } as Partial<LineShape> },
        }),
      );

      preserveAttachmentHandler = newPreserveAttachmentHandler({ shapeComposite, lineId: option.lineShape.id });
      if (preserveAttachmentHandler.hasAttachment) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.PRESERVE_ATTACHMENT, COMMAND_EXAM_SRC.DISABLE_SNAP]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_SNAP]);
      }
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
          const d = zeroEdge ? sub(p, edge[0]) : rotateFn(sub(p, edge[0]), true);
          coordinateRenderer.saveCoord(p);

          const curves = fillArray(option.index + 1, undefined, option.lineShape.curves);
          curves[option.index] = d.y !== 0 ? { d } : undefined;
          const patch = { curves } as Partial<LineShape>;

          preserveAttachmentHandler.setActive(!!event.data.alt);
          const update = {
            [option.lineShape.id]: patch,
            ...preserveAttachmentHandler.getPatch(patch),
          };

          ctx.setTmpShapeMap(getPatchAfterLayouts(ctx.getShapeComposite(), { update }));
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

      coordinateRenderer.render(renderCtx, ctx.getViewRect(), scale);
      applyFillStyle(renderCtx, { color: style.selectionPrimary });

      const line: LineShape = { ...option.lineShape, ...ctx.getTmpShapeMap()[option.lineShape.id] };
      const d = (line.curves?.[option.index] as ArcCurveControl | undefined)?.d ?? { x: 0, y: 0 };
      const p = zeroEdge ? add(d, edge[0]) : add(rotateFn({ x: 0, y: d.y }), getCenter(edge[0], edge[1]));

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

      preserveAttachmentHandler.render(renderCtx, style, scale);
    },
  };
}
