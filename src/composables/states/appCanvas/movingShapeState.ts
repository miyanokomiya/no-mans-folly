import type { AppCanvasState } from "./core";
import { translateOnSelection } from "./commons";
import { IRectangle, IVec2, add, sub } from "okageo";
import { Shape } from "../../../models";
import { ShapeSnapping, newShapeSnapping } from "../../shapeSnapping";
import { getSnappingLines, getWrapperRect } from "../../../shapes";
import * as geometry from "../../../utils/geometry";
import { applyStrokeStyle } from "../../../utils/strokeStyle";

export function newMovingShapeState(): AppCanvasState {
  let shapeSnapping: ShapeSnapping;
  let movingRect: IRectangle;
  let snappingLines: [IVec2, IVec2][];

  return {
    getLabel: () => "MovingShape",
    onStart: async (ctx) => {
      ctx.startDragging();
      ctx.setCursor("move");

      const shapeMap = ctx.getShapeMap();
      const selectedIdMap = ctx.getSelectedShapeIdMap();
      const snappableShapes = Object.values(shapeMap).filter((s) => !selectedIdMap[s.id]);
      shapeSnapping = newShapeSnapping({
        shapeSnappingList: snappableShapes.map((s) => [s.id, getSnappingLines(ctx.getShapeStruct, s)]),
      });
      movingRect = geometry.getWrapperRect(
        Object.keys(selectedIdMap).map((id) => getWrapperRect(ctx.getShapeStruct, shapeMap[id]))
      );
    },
    onEnd: async (ctx) => {
      ctx.stopDragging();
      ctx.setTmpShapeMap({});
      ctx.setCursor();
    },
    handleEvent: async (ctx, event) => {
      switch (event.type) {
        case "pointermove": {
          const d = sub(event.data.current, event.data.start);
          const movedRect = {
            x: movingRect.x + d.x,
            y: movingRect.y + d.y,
            width: movingRect.width,
            height: movingRect.height,
          };

          const snappingResult = shapeSnapping.test(movedRect);
          const adjustedD = snappingResult
            ? add(d, {
                x: snappingResult.dx ?? 0,
                y: snappingResult.dy ?? 0,
              })
            : d;

          snappingLines = snappingResult?.targets.map((t) => t.line) ?? [];

          const shapeMap = ctx.getShapeMap();
          ctx.setTmpShapeMap(
            Object.keys(ctx.getSelectedShapeIdMap()).reduce<{ [id: string]: Partial<Shape> }>((m, id) => {
              const s = shapeMap[id];
              if (s) {
                m[id] = { p: add(s.p, adjustedD) };
              }
              return m;
            }, {})
          );
          return;
        }
        case "pointerup": {
          const val = ctx.getTmpShapeMap();
          if (Object.keys(val).length > 0) {
            ctx.patchShapes(val);
          }
          return translateOnSelection(ctx);
        }
        case "selection": {
          return translateOnSelection(ctx);
        }
        default:
          return;
      }
    },
    render: (ctx, renderCtx) => {
      if (snappingLines) {
        const style = ctx.getStyleScheme();
        applyStrokeStyle(renderCtx, { color: style.selectionPrimary });
        renderCtx.lineWidth = 3 * ctx.getScale();

        renderCtx.beginPath();
        snappingLines.forEach(([a, b]) => {
          renderCtx.moveTo(a.x, a.y);
          renderCtx.lineTo(b.x, b.y);
        });
        renderCtx.stroke();
      }
    },
  };
}
