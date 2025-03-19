import { add, IVec2, multi } from "okageo";
import { StyleScheme } from "../../models";
import { ShapeComposite } from "../shapeComposite";
import { defineShapeHandler } from "./core";
import { CanvasCTX } from "../../utils/types";
import { VnNodeShape } from "../../shapes/vectorNetworks/vnNode";
import { newCircleHitTest } from "../shapeHitTest";
import { TAU } from "../../utils/geometry";
import { applyFillStyle } from "../../utils/fillStyle";
import { renderMoveIcon, renderOutlinedCircle, renderPlusIcon } from "../../utils/renderer";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { COLORS } from "../../utils/color";

const NEW_EDGE_ANCHOR_SIZE = 5;
const MOVE_ANCHOR_SIZE = 5;

type HitAnchor = [type: "move" | "new-edge", IVec2];

interface HitResult {
  type: HitAnchor[0];
}

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newVnNodeHandler = defineShapeHandler<HitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as VnNodeShape;
  const center = shape.p;

  function getMoveAnchor(scale = 1): { c: IVec2; r: number } | undefined {
    if (shape.locked) return;

    const moveAnchorSize = MOVE_ANCHOR_SIZE * scale;
    return {
      c: add(add(center, { x: -shape.r, y: -shape.r }), multi({ x: -MOVE_ANCHOR_SIZE, y: -MOVE_ANCHOR_SIZE }, scale)),
      r: moveAnchorSize * 2,
    };
  }

  function getNewEdgeAnchor(scale = 1): { c: IVec2; r: number } {
    const moveAnchorSize = NEW_EDGE_ANCHOR_SIZE * scale;
    return { c: center, r: moveAnchorSize * 2 };
  }

  function hitTest(p: IVec2, scale = 1): HitResult | undefined {
    const moveAnchor = getMoveAnchor(scale);
    if (moveAnchor && newCircleHitTest(moveAnchor.c, moveAnchor.r).test(p)) return { type: "move" };

    const newEdgeAnchor = getNewEdgeAnchor(scale);
    if (newCircleHitTest(newEdgeAnchor.c, newEdgeAnchor.r).test(p)) return { type: "new-edge" };

    return;
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: HitResult) {
    const moveAnchor = getMoveAnchor(scale);
    if (moveAnchor) {
      const color = hitResult?.type === "move" ? style.selectionSecondaly : style.selectionPrimary;
      applyFillStyle(ctx, { color });
      applyStrokeStyle(ctx, { color, width: style.selectionLineWidth * scale });
      ctx.beginPath();
      ctx.arc(moveAnchor.c.x, moveAnchor.c.y, moveAnchor.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      renderMoveIcon(ctx, moveAnchor.c, moveAnchor.r);
    }

    {
      const newEdgeAnchor = getNewEdgeAnchor(scale);
      const color = hitResult?.type === "new-edge" ? style.selectionSecondaly : style.selectionPrimary;
      renderOutlinedCircle(ctx, newEdgeAnchor.c, newEdgeAnchor.r, color);
      applyStrokeStyle(ctx, { color: COLORS.WHITE, width: style.selectionLineWidth * scale });
      renderPlusIcon(ctx, newEdgeAnchor.c, newEdgeAnchor.r * 2 - 4 * scale);
    }
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      return a?.type === b?.type;
    },
  };
});
export type VnNodeHandler = ReturnType<typeof newVnNodeHandler>;
