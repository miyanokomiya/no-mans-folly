import { AffineMatrix, IVec2, add, applyAffine, pathSegmentRawsToString } from "okageo";
import { LineHead } from "../../models";
import { SVGElementInfo } from "../../utils/svgElements";
import { applyPath, createSVGCurvePath } from "../../utils/renderer";

// This should be 6 for backward compatibility.
export const DEFAULT_HEAD_SIZE = 6;

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

export function getHeadBaseHeight(lineWidth: number, size = DEFAULT_HEAD_SIZE): number {
  return lineWidth * size;
}

export function defineLineHeadPolygon<T extends LineHead>(option: {
  label: string;
  create: (arg: Partial<T>) => T;
  getSrcPath: (lineWidth: number, size?: number) => IVec2[];
  filled?: boolean;
}) {
  const struct: LineHeadStruct<T> = {
    label: option.label,
    create(arg = {}) {
      return option.create(arg);
    },
    render(ctx, head, transform, lineWidth) {
      ctx.beginPath();
      applyPath(ctx, getPath(transform, lineWidth, head.size), true);

      if (option.filled) {
        const tmp = ctx.fillStyle;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.fillStyle = tmp;
      }

      ctx.stroke();
    },
    createSVGElementInfo(head, transform, lineWidth) {
      return {
        tag: "path",
        attributes: {
          d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth, head.size), [], true)),
          fill: option.filled ? undefined : "none",
        },
      };
    },
    clip(region, head, transform, lineWidth) {
      applyPath(region, getPath(transform, lineWidth, head.size), true);
    },
    createSVGClipPathCommand(head, transform, lineWidth) {
      return pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth, head.size), [], true));
    },
    getWrapperSrcPath(head, lineWidth) {
      return option.getSrcPath(lineWidth, head.size);
    },
    getRotationOriginDistance(head, lineWidth) {
      return getHeadBaseHeight(lineWidth, head.size);
    },
  };

  function getPath(transform: AffineMatrix, lineWidth: number, size?: number) {
    return option.getSrcPath(lineWidth, size).map((p) => applyAffine(transform, p));
  }

  return struct;
}

export function defineLineHeadStiffPolygon<T extends LineHead>(option: {
  label: string;
  create: (arg: Partial<T>) => T;
  getSrcPath: (lineWidth: number, size?: number) => IVec2[];
  filled?: boolean;
}) {
  const struct: LineHeadStruct<T> = {
    label: option.label,
    create(arg = {}) {
      return option.create(arg);
    },
    render(ctx, head, transform, lineWidth) {
      ctx.beginPath();
      applyPath(ctx, getPath(transform, lineWidth, head.size), true);

      if (option.filled) {
        const tmp = ctx.fillStyle;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.fillStyle = tmp;
      }

      ctx.stroke();
    },
    createSVGElementInfo(head, transform, lineWidth) {
      return {
        tag: "path",
        attributes: {
          d: pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth, head.size), [], true)),
          fill: option.filled ? undefined : "none",
        },
      };
    },
    clip(region, head, transform, lineWidth) {
      applyPath(region, getPath(transform, lineWidth, head.size), true);
    },
    createSVGClipPathCommand(head, transform, lineWidth) {
      return pathSegmentRawsToString(createSVGCurvePath(getPath(transform, lineWidth, head.size), [], true));
    },
    getWrapperSrcPath(head, lineWidth) {
      return option.getSrcPath(lineWidth, head.size);
    },
  };

  function getPath(transform: AffineMatrix, lineWidth: number, size?: number) {
    return option.getSrcPath(lineWidth, size).map((p) => add({ x: transform[4], y: transform[5] }, p));
  }

  return struct;
}
