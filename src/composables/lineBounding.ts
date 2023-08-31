import { IVec2 } from "okageo";
import { StyleScheme } from "../models";
import { LineShape, getEdges, getLinePath } from "../shapes/line";
import { newCircleHitTest } from "./shapeHitTest";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { isPointCloseToSegment } from "../utils/geometry";
import { applyFillStyle } from "../utils/fillStyle";

const VERTEX_R = 8;

type LineHitType = "vertex" | "edge";
export interface LineHitResult {
  type: LineHitType;
  index: number;
}

interface Option {
  lineShape: LineShape;
  styleScheme: StyleScheme;
  scale?: number;
}

export function newLineBounding(option: Option) {
  const lineShape = option.lineShape;
  const vertices = getLinePath(lineShape);
  const edges = getEdges(lineShape);
  let scale = option.scale ?? 1;
  let hitResult: LineHitResult | undefined;

  function updateScale(val: number) {
    scale = val;
  }

  // Returns true when something changes
  function saveHitResult(result?: LineHitResult): boolean {
    const prev = hitResult;
    hitResult = result;
    if (!result) return !!prev;
    if (!prev) return true;
    if (prev.index !== result.index) return true;
    if (prev.type !== result.type) return true;
    return false;
  }

  function hitTest(p: IVec2): LineHitResult | undefined {
    const vertexSize = VERTEX_R * scale;

    const vertexIndex = vertices.findIndex((v) => {
      const testFn = newCircleHitTest(v, vertexSize);
      return testFn.test(p);
    });
    if (vertexIndex !== -1) {
      return { type: "vertex", index: vertexIndex };
    }

    const edgeIndex = edges.findIndex((seg) => {
      return isPointCloseToSegment(seg, p, vertexSize);
    });
    if (edgeIndex !== -1) {
      return { type: "edge", index: edgeIndex };
    }
  }

  function getCursorStyle(hitBounding: LineHitResult): string | undefined {
    if (!hitBounding) return;

    switch (hitBounding.type) {
      case "vertex":
        return "grab";
      case "edge":
        return "move";
      default:
        return;
    }
  }

  function render(ctx: CanvasRenderingContext2D) {
    const vertexSize = VERTEX_R * scale;
    const style = option.styleScheme;
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 3 * scale });
    ctx.fillStyle = "#fff";

    const points = [lineShape.p, lineShape.q];
    points.forEach((p) => {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    if (hitResult) {
      switch (hitResult.type) {
        case "vertex": {
          applyFillStyle(ctx, { color: style.selectionPrimary });
          const p = points[hitResult.index];
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "edge": {
          const [a, b] = edges[hitResult.index];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          break;
        }
      }
    }
  }

  return { updateScale, saveHitResult, hitTest, getCursorStyle, render };
}
export type LineBounding = ReturnType<typeof newLineBounding>;
