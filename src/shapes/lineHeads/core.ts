import { AffineMatrix } from "okageo";
import { LineHead } from "../../models";
import { SVGElementInfo } from "../../utils/svgElements";

export interface LineHeadStruct<T extends LineHead> {
  label: string;
  create: (arg?: Partial<T>) => T;
  render: (ctx: CanvasRenderingContext2D, head: T, transform: AffineMatrix, lineWidth: number) => void;
  createSVGElementInfo: (head: T, transform: AffineMatrix, lineWidth: number) => SVGElementInfo | undefined;
  clip: (region: Path2D, head: T, transform: AffineMatrix, lineWidth: number) => void;
  createSVGClipPathCommand: (head: T, transform: AffineMatrix, lineWidth: number) => string | undefined;
  /**
   * Returns radius bigger enough to accomodate this head.
   * This value isn't the precisest to omit some complicate parameters such as rotation.
   */
  getWrapperRadius: (head: T, lineWidth: number) => number;
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
  getWrapperRadius: () => 0,
};
