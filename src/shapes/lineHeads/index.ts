import { AffineMatrix } from "okageo";
import { LineHead } from "../../models";
import { LineHeadClosedFilledStruct } from "./core";

export function createLineHead<T extends LineHead>(type: string, arg?: Partial<T>): T {
  return LineHeadClosedFilledStruct.create(arg) as T;
}

export function renderLineHead<T extends LineHead>(ctx: CanvasRenderingContext2D, head: T, transform: AffineMatrix) {
  LineHeadClosedFilledStruct.render(ctx, head, transform);
}

export function clipLineHead<T extends LineHead>(region: Path2D, head: T, transform: AffineMatrix) {
  LineHeadClosedFilledStruct.clip(region, head, transform);
}
