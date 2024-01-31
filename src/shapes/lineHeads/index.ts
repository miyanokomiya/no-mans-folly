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

export function renderLineHead<T extends LineHead>(
  ctx: CanvasRenderingContext2D,
  head: T,
  transform: AffineMatrix,
  lineWidth: number,
) {
  getLineHeadStruct(head.type).render(ctx, head, transform, lineWidth);
}

export function createLineHeadSVGElementInfo<T extends LineHead>(head: T, transform: AffineMatrix, lineWidth: number) {
  return getLineHeadStruct(head.type).createSVGElementInfo(head, transform, lineWidth);
}

export function clipLineHead<T extends LineHead>(region: Path2D, head: T, transform: AffineMatrix, lineWidth: number) {
  getLineHeadStruct(head.type).clip(region, head, transform, lineWidth);
}

export function createLineHeadSVGClipPathCommand<T extends LineHead>(
  head: T,
  transform: AffineMatrix,
  lineWidth: number,
) {
  return getLineHeadStruct(head.type).createSVGClipPathCommand(head, transform, lineWidth);
}

export function getLineHeadWrapperRadius<T extends LineHead>(head: T, lineWidth: number): number {
  return getLineHeadStruct(head.type).getWrapperRadius(head, lineWidth);
}
