import { IRectangle, IVec2 } from "okageo";
import { ShapeSnappingLines } from "../core";
import { getRectCenterLines, getRectLines, ISegment, isSameValue, normalizeLineRotation } from "../../utils/geometry";

export function getStandardSnappingLines(
  wrapperRect: IRectangle,
  localRectPolygon: IVec2[],
  rotation: number,
): ShapeSnappingLines {
  const [t, r, b, l] = getRectLines(wrapperRect);
  const [cv, ch] = getRectCenterLines(wrapperRect);
  const linesByRotation = new Map<number, ISegment[]>([
    [Math.PI / 2, [l, cv, r]],
    [0, [t, ch, b]],
  ]);

  if (!isSameValue(Math.sin(2 * rotation), 0)) {
    const [tl, tr, br, bl] = localRectPolygon;
    const midTop = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
    const midBottom = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
    const midLeft = { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 };
    const midRight = { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 };
    linesByRotation.set(normalizeLineRotation(rotation + Math.PI / 2), [
      [tl, bl],
      [midTop, midBottom],
      [tr, br],
    ]);
    linesByRotation.set(normalizeLineRotation(rotation), [
      [tl, tr],
      [midLeft, midRight],
      [bl, br],
    ]);
  }

  return { linesByRotation };
}
