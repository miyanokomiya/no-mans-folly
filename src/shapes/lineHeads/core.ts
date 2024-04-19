import { AffineMatrix, IVec2, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { SVGElementInfo } from "../../utils/svgElements";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";

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

export function defineLineHeadPolygon<T extends LineHead>(option: {
  label: string;
  create: (arg: Partial<T>) => T;
  getSrcPath: (lineWidth: number) => IVec2[];
  filled?: boolean;
}) {
  const struct: LineHeadStruct<T> = {
    label: option.label,
    create(arg = {}) {
      return option.create(arg);
    },
    render(ctx, _head, transform, lineWidth) {
      ctx.beginPath();
      applyPath(ctx, getPath(transform, lineWidth), true);

      if (option.filled) {
        const tmp = ctx.fillStyle;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.fillStyle = tmp;
      }

      ctx.stroke();
    },
    createSVGElementInfo(_head, transform, lineWidth) {
      return {
        tag: "path",
        attributes: {
          d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth), [], true)),
          fill: option.filled ? undefined : "none",
        },
      };
    },
    clip(region, _head, transform, lineWidth) {
      applyPath(region, getPath(transform, lineWidth), true);
    },
    createSVGClipPathCommand(_head, transform, lineWidth) {
      return pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth), [], true));
    },
    getWrapperSrcPath(_head, lineWidth) {
      return option.getSrcPath(lineWidth);
    },
    getRotationOriginDistance(_head, lineWidth) {
      return getHeadBaseHeight(lineWidth);
    },
  };

  function getPath(transform: AffineMatrix, lineWidth: number) {
    return option.getSrcPath(lineWidth).map((p) => applyAffine(transform, p));
  }

  return struct;
}
