import type { AppCanvasState } from "../core";
import { LineShape, getEdges } from "../../../../shapes/line";
import { IVec2, add, getSymmetry, isSame } from "okageo";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { getPatchAfterLayouts } from "../../../shapeLayoutHandler";
import { BezierCurveControl, CurveControl } from "../../../../models";
import { renderOutlinedCircle } from "../../../../utils/renderer";
import { newShapeSnapping, renderSnappingResult, ShapeSnapping, SnappingResult } from "../../../shapeSnapping";
import { isBezieirControl } from "../../../../utils/path";
import { BEZIER_ANCHOR_SIZE, renderBezierControls } from "../../../lineBounding";
import { ISegment } from "../../../../utils/geometry";

interface Option {
  lineShape: LineShape;
  index: number;
  subIndex: 0 | 1;
  p: IVec2;
}

export function newMovingLineBezierState(option: Option): AppCanvasState {
  const edges = getEdges(option.lineShape);
  const edge = edges[option.index];
  const symmetricAvailable = checkSymmetricAvailable(option.lineShape, option.index, option.subIndex);
  let shapeSnapping: ShapeSnapping;
  let snappingResult: SnappingResult | undefined;
  let currentBezier: BezierCurveControl | undefined;

  return {
    getLabel: () => "MovingLineBezier",
    onStart: (ctx) => {
      ctx.startDragging();
      if (symmetricAvailable) {
        ctx.setCommandExams([COMMAND_EXAM_SRC.BEZIER_SYMMETRICALLY, COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);
      } else {
        ctx.setCommandExams([COMMAND_EXAM_SRC.DISABLE_LINE_VERTEX_SNAP]);
      }

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

          if (symmetricAvailable && event.data.shift) {
            switch (symmetricAvailable) {
              case "prev": {
                const prevIndex = option.index - 1;
                curves[prevIndex] = getSymmetricPrevCurveControl(edges, curves, prevIndex, p);
                break;
              }
              case "next": {
                const nextIndex = option.index + 1;
                curves[nextIndex] = getSymmetricNextCurveControl(edges, curves, nextIndex, p);
                break;
              }
              case "loop-first": {
                const prevIndex = edges.length - 1;
                curves[prevIndex] = getSymmetricPrevCurveControl(edges, curves, prevIndex, p);
                break;
              }
              case "loop-last": {
                const nextIndex = 0;
                curves[nextIndex] = getSymmetricNextCurveControl(edges, curves, nextIndex, p);
                break;
              }
            }
          }

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

export function checkSymmetricAvailable(
  lineShape: LineShape,
  index: number,
  subIndex: 0 | 1,
): "prev" | "next" | "loop-first" | "loop-last" | undefined {
  const edges = getEdges(lineShape);
  const curves = lineShape.curves?.concat() ?? [];

  if (subIndex === 0 && index > 0) {
    const prevC = curves[index - 1];
    if (!prevC || isBezieirControl(prevC)) return "prev";
  } else if (subIndex === 1 && index < edges.length - 1) {
    const nextC = curves[index + 1];
    if (!nextC || isBezieirControl(nextC)) return "next";
  }

  if (isSame(lineShape.p, lineShape.q)) {
    if (index === 0 && subIndex === 0) {
      const prevC = curves[edges.length - 1];
      if (!prevC || isBezieirControl(prevC)) return "loop-first";
    }
    if (index === edges.length - 1 && subIndex === 1) {
      const nextC = curves[0];
      if (!nextC || isBezieirControl(nextC)) return "loop-last";
    }
  }
}

function getSymmetricPrevCurveControl(
  edges: ISegment[],
  curves: LineShape["curves"],
  prevIndex: number,
  p: IVec2,
): CurveControl | undefined {
  const prevEdge = edges[prevIndex];
  const prevC = curves?.[prevIndex];
  if (!prevC) {
    return { c1: prevEdge[0], c2: getSymmetry(p, prevEdge[1]) };
  } else if (isBezieirControl(prevC)) {
    return { c1: prevC.c1, c2: getSymmetry(p, prevEdge[1]) };
  }
}

function getSymmetricNextCurveControl(
  edges: ISegment[],
  curves: LineShape["curves"],
  nextIndex: number,
  p: IVec2,
): CurveControl | undefined {
  const nextEdge = edges[nextIndex];
  const nextC = curves?.[nextIndex];
  if (!nextC) {
    return { c1: getSymmetry(p, nextEdge[0]), c2: nextEdge[1] };
  } else if (isBezieirControl(nextC)) {
    return { c1: getSymmetry(p, nextEdge[0]), c2: nextC.c2 };
  }
}
