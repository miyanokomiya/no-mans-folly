import { AffineMatrix, IVec2 } from "okageo";
import { LineHead } from "../../models";
import { LineHeadFallbackStruct, LineHeadStruct } from "./core";
import { LineHeadOpen } from "./open";
import { LineHeadClosedFilledStruct, LineHeadClosedBlankStruct } from "./closed";
import { LineHeadDotBlank, LineHeadDotFilled } from "./dot";
import { LineHeadDotTopFilled, LineHeadDotTopBlank } from "./dot_top";
import { LineHeadDiamondFilled, LineHeadDiamondBlank } from "./diamond";
import { LineHeadErOne } from "./er_one";
import { LineHeadErMany } from "./er_many";
import { LineHeadErOneOnly } from "./er_one_only";
import { LineHeadErOneMany } from "./er_one_many";
import { LineHeadErZeroOne } from "./er_zero_one";
import { LineHeadErZeroMany } from "./er_zero_many";

const STRUCTS: { [type: string]: LineHeadStruct<any> } = {
  open: LineHeadOpen,
  closed_filled: LineHeadClosedFilledStruct,
  closed_blank: LineHeadClosedBlankStruct,
  dot_filled: LineHeadDotFilled,
  dot_blank: LineHeadDotBlank,
  dot_top_filled: LineHeadDotTopFilled,
  dot_top_blank: LineHeadDotTopBlank,
  diamond_filled: LineHeadDiamondFilled,
  diamond_blank: LineHeadDiamondBlank,
  er_one: LineHeadErOne,
  er_many: LineHeadErMany,
  er_one_only: LineHeadErOneOnly,
  er_one_many: LineHeadErOneMany,
  er_zero_one: LineHeadErZeroOne,
  er_zero_many: LineHeadErZeroMany,
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

export function getLineHeadWrapperSrcPath<T extends LineHead>(head: T, lineWidth: number): IVec2[] {
  return getLineHeadStruct(head.type).getWrapperSrcPath(head, lineWidth);
}

export function getLineHeadRotationOriginDistance<T extends LineHead>(head: T, lineWidth: number): number | undefined {
  return getLineHeadStruct(head.type).getRotationOriginDistance?.(head, lineWidth);
}
