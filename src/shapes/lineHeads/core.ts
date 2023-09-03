import { AffineMatrix, applyAffine } from "okageo";
import { LineHead } from "../../models";
import { applyPath } from "../../utils/renderer";

export interface LineHeadStruct<T extends LineHead> {
  label: string;
  create: (arg?: Partial<T>) => T;
  render: (ctx: CanvasRenderingContext2D, head: T, transform: AffineMatrix) => void;
  clip: (region: Path2D, head: T, transform: AffineMatrix) => void;
}

export const LineHeadClosedFilledStruct: LineHeadStruct<LineHead> = {
  label: "Closed Filled",
  create(arg = {}) {
    return {
      ...arg,
      type: "closed_filled",
    };
  },
  render(ctx, _head, transform: AffineMatrix) {
    const height = 16;
    const width = 20;

    ctx.beginPath();
    applyPath(
      ctx,
      [
        { x: 0, y: 0 },
        { x: -height, y: -width / 2 },
        { x: -height, y: width / 2 },
      ].map((p) => applyAffine(transform, p)),
      true
    );
    ctx.fill();
  },
  clip(region, _head, transform: AffineMatrix) {
    const height = 16;
    const width = 20;

    applyPath(
      region,
      [
        { x: 0, y: -width / 2 },
        { x: -height, y: -width / 2 },
        { x: -height, y: width / 2 },
        { x: 0, y: width / 2 },
      ].map((p) => applyAffine(transform, p)),
      true
    );
  },
};
