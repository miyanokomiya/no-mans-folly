import { IVec2 } from "okageo";
import { StyleScheme } from "../models";
import { LineShape } from "../shapes/line";
import { newCircleHitTest } from "./shapeHitTest";
import { applyStrokeStyle } from "../utils/strokeStyle";

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
  const vertices = [lineShape.p, lineShape.q];
  let scale = option.scale ?? 1;

  function updateScale(val: number) {
    scale = val;
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
  }

  function getCursorStyle(hitBounding: LineHitResult): string | undefined {
    if (!hitBounding) return;

    switch (hitBounding.type) {
      case "vertex":
        return "grab";
      default:
        return;
    }
  }

  function render(ctx: CanvasRenderingContext2D) {
    const vertexSize = VERTEX_R * scale;
    const style = option.styleScheme;
    applyStrokeStyle(ctx, { color: style.selectionPrimary });
    ctx.lineWidth = 3 * scale;
    ctx.fillStyle = "#fff";

    const points = [lineShape.p, lineShape.q];
    points.forEach((p) => {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, vertexSize, vertexSize, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  return { updateScale, hitTest, getCursorStyle, render };
}
export type LineBounding = ReturnType<typeof newLineBounding>;
