import { AffineMatrix, IVec2 } from "okageo";
import { LineHead } from "../../models";
import { SVGElementInfo } from "../../utils/svgElements";

export interface LineHeadStruct<T extends LineHead> {
  label: string;
  create: (arg?: Partial<T>) => T;
  render: (ctx: CanvasRenderingContext2D, head: T, transform: AffineMatrix, lineWidth: number) => void;
  createSVGElementInfo: (head: T, transform: AffineMatrix, lineWidth: number) => SVGElementInfo | undefined;
  clip: (region: Path2D, head: T, transform: AffineMatrix, lineWidth: number) => void;
  createSVGClipPathCommand: (head: T, transform: AffineMatrix, lineWidth: number) => string | undefined;
  getWrapperSrcPath: (head: T, lineWidth: number) => IVec2[];
  /**
   * Returns the distance between the vertex and the point that is used as the origin to calculate radian of the head.
   * When undefined, it means radian of the head doesn't matter to the head type.
   */
  getRotationOriginDistance?: (head: T, lineWidth: number) => number;
}

export const LineHeadFallbackStruct: LineHeadStruct<LineHead> = {
  label: "Unknown",
  create(arg = {}) {
    return {
      ...arg,
      type: "unknown",
    };
  },
  render() {},
  createSVGElementInfo: () => undefined,
  clip() {},
  createSVGClipPathCommand: () => undefined,
  getWrapperSrcPath: () => [],
};

export function getHeadBaseHeight(lineWidth: number): number {
  return lineWidth * 6;
}
