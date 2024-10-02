import type { AppCanvasState } from "../core";
import { LineShape, getEdges } from "../../../../shapes/line";
import { IVec2, add } from "okageo";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { BezierCurveControl } from "../../../../models";
import { renderOutlinedCircle } from "../../../../utils/renderer";
import { newShapeSnapping, renderSnappingResult, ShapeSnapping, SnappingResult } from "../../../shapeSnapping";
import { isBezieirControl } from "../../../../utils/path";
import { BEZIER_ANCHOR_SIZE, renderBezierControls } from "../../../lineBounding";

interface Option {
  lineShape: LineShape;
  index: number;
  subIndex: 0 | 1;
  p: IVec2;
}

export function newMovingLineBezierState(option: Option): AppCanvasState {
  const edge = getEdges(option.lineShape)[option.index];
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let currentBezier: BezierCurveControl | undefined;

  return {
    getLabel: () => "MovingLineBezier",
    onStart: (ctx) => {
      ctx.startDragging();
      ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);

      const shapeComposite = ctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;

      const snappableShapes = shapeComposite.getShapesOverlappingRect(Object.values(shapeMap), ctx.getViewRect());
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, shapeComposite.getSnappingLines(s)]),
        scale: ctx.getScale(),
        gridSnapping: ctx.getGrid().getSnappingLines(),
      });

      const curves = option.lineShape.curves?.concat() ?? [];
      const currentCurve = option.lineShape.curves?.[option.index];
      if (isBezieirControl(currentCurve)) {
        currentBezier = currentCurve;
      }

      curves[option.index] =
        option.subIndex === 0
          ? { c1: option.p, c2: currentBezier?.c2 ?? edge[1] }
          : { c1: currentBezier?.c1 ?? edge[0], c2: option.p };
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

          const curves = option.lineShape.curves?.concat() ?? [];
          curves[option.index] =
            option.subIndex === 0
              ? { c1: p, c2: currentBezier?.c2 ?? edge[1] }
              : { c1: currentBezier?.c1 ?? edge[0], c2: p };
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
      const bezierSize = BEZIER_ANCHOR_SIZE * scale;

      const line = ctx.getShapeComposite().mergedShapeMap[option.lineShape.id] as LineShape;
      const curve = line.curves?.[option.index];
      if (!isBezieirControl(curve)) return;

      renderBezierControls(renderCtx, style, scale, line);
      const p = option.subIndex === 0 ? curve.c1 : curve.c2;
      renderOutlinedCircle(renderCtx, p, bezierSize, style.selectionSecondaly);

      if (snappingResult) {
        renderSnappingResult(renderCtx, {
          style,
          scale,
          result: snappingResult,
        });
      }
    },
  };
}
