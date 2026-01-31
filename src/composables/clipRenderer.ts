import { SVGElementInfo } from "../utils/svgElements";
import { CanvasCTX } from "../utils/types";

interface ClipoutRendererOption {
  ctx: CanvasCTX;
  fillRange: (region: Path2D) => void;
}

/**
 * Keep applying clip-out to the target range.
 * This module calls neither "ctx.save" nor "ctx.restore".
 */
export function newClipoutRenderer(option: ClipoutRendererOption) {
  function applyClip(fn: (region: Path2D) => void) {
    const clipRegion = new Path2D();
    option.fillRange(clipRegion);
    fn(clipRegion);
    option.ctx.clip(clipRegion, "evenodd");
  }

  return { applyClip };
}

interface ClipoutSVGRendererOption {
  clipId: string;
  rangeStr: string;
}

/**
 * Keep applying clip-out to the target range.
 * This module creates multiple "clipPath" elements to realize accumulated clip-out.
 * "getCurrentClipId" returns the current clip-out ID for "clip-path" attribute.
 */
export function newSVGClipoutRenderer(option: ClipoutSVGRendererOption) {
  const clipElmList: SVGElementInfo[] = [];

  function applyClip(pathStrList: string[]) {
    const pathStr = pathStrList.join(" ");

    const prevId = getCurrentClipId();
    const index = clipElmList.length;
    const clipPathId = `${option.clipId}-${index}`;
    const clipPath: SVGElementInfo = {
      tag: "clipPath",
      attributes: { id: clipPathId, "clip-path": prevId ? `url(#${prevId})` : undefined },
      children: [
        {
          tag: "path",
          attributes: {
            d: `${pathStr} ${option.rangeStr}`,
            "clip-rule": "evenodd",
          },
        },
      ],
    };

    clipElmList.push(clipPath);
  }

  function getCurrentClipId(): string | undefined {
    return clipElmList.at(-1)?.attributes?.id?.toString();
  }

  function getClipElementList(): SVGElementInfo[] {
    return clipElmList;
  }

  return { applyClip, getCurrentClipId, getClipElementList };
}
