import { AffineMatrix } from "okageo";
import { LineHead } from "../../models";
import { LineHeadFallbackStruct, LineHeadStruct } from "./core";
import { LineHeadOpen } from "./open";
import { LineHeadClosedFilledStruct } from "./closed_filled";
import { LineHeadClosedBlankStruct } from "./closed_blank";
import { LineHeadDotFilled } from "./dot_filled";
import { LineHeadDotBlank } from "./dot_blank";

const STRUCTS: { [type: string]: LineHeadStruct<any> } = {
  open: LineHeadOpen,
  closed_filled: LineHeadClosedFilledStruct,
  closed_blank: LineHeadClosedBlankStruct,
  dot_filled: LineHeadDotFilled,
  dot_blank: LineHeadDotBlank,
};

export function getLineHeadStruct(type: string): LineHeadStruct<any> {
  return STRUCTS[type] ?? LineHeadFallbackStruct;
}

export function createLineHead<T extends LineHead>(type: string, arg?: Partial<T>): T {
  return getLineHeadStruct(type).create(arg) as T;
}

export function renderLineHead<T extends LineHead>(ctx: CanvasRenderingContext2D, head: T, transform: AffineMatrix) {
  getLineHeadStruct(head.type).render(ctx, head, transform);
}

export function clipLineHead<T extends LineHead>(region: Path2D, head: T, transform: AffineMatrix) {
  getLineHeadStruct(head.type).clip(region, head, transform);
}
