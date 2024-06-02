import { IRectangle, IVec2, add, getRadian, multi } from "okageo";
import { LineBodyItem, LineShape } from "../shapes/line";
import { getOptimalElbowBody } from "../utils/elbowLine";
import { ShapeComposite } from "./shapeComposite";
import { restoreBodyFromRoundedElbow } from "../utils/curveLine";

interface Option {
  getShapeComposite: () => ShapeComposite;
}

export function newElbowLineHandler(option: Option) {
  function optimizeElbow(lineShape: LineShape): LineBodyItem[] {
    const [pBounds, qBounds] = getTargetRects(option, lineShape);
    const vertices = getOptimalElbowBody(lineShape.p, lineShape.q, pBounds, qBounds, 30);
    return inheritElbowExtraDistance(lineShape, vertices);
  }

  return { optimizeElbow };
}
export type ElbowLineHandler = ReturnType<typeof newElbowLineHandler>;

export function inheritElbowExtraDistance(lineShape: LineShape, nextBodyvertices: IVec2[]): LineBodyItem[] {
  const srcBody = lineShape.body;
  if (!srcBody || srcBody.length === 0) {
    return nextBodyvertices.map((p) => ({ p }));
  }

  // Regard curvec elbow that has extra body vertices for rounded appearance.
  const restoredSrcBody = lineShape.curveType === "auto" ? restoreBodyFromRoundedElbow(lineShape) : srcBody;
  const ret: LineBodyItem[] = [];
  let v: IVec2 | undefined;

  for (let i = 0; i < nextBodyvertices.length; i++) {
    const p0 = v ? add(nextBodyvertices[i], v) : nextBodyvertices[i];
    const elbow = restoredSrcBody[i]?.elbow;
    if (elbow && i < nextBodyvertices.length - 1) {
      const prev = i === 0 ? lineShape.p : ret[ret.length - 1].p;
      const r = getRadian(p0, prev);
      v = multi({ x: Math.cos(r), y: Math.sin(r) }, elbow.d);
      ret.push({ p: add(p0, v), elbow: { ...elbow, p: nextBodyvertices[i] } });
    } else {
      v = undefined;
      ret.push({ p: p0 });
    }
  }

  return ret;
}

function getTargetRects(option: Option, line: LineShape): [IRectangle, IRectangle] {
  const shapeComposite = option.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;

  let pRect: IRectangle;
  if (line.pConnection && shapeMap[line.pConnection.id]) {
    pRect = shapeComposite.getWrapperRect(shapeMap[line.pConnection.id]);
  } else {
    if (line.p.x < line.q.x) {
      pRect = { x: line.p.x - 40, y: line.p.y - 20, width: 40, height: 40 };
    } else {
      pRect = { x: line.p.x, y: line.p.y - 20, width: 40, height: 40 };
    }
  }

  let qRect: IRectangle;
  if (line.qConnection && shapeMap[line.qConnection.id]) {
    qRect = shapeComposite.getWrapperRect(shapeMap[line.qConnection.id]);
  } else {
    if (line.q.x < line.p.x) {
      qRect = { x: line.q.x - 40, y: line.q.y - 20, width: 40, height: 40 };
    } else {
      qRect = { x: line.q.x, y: line.q.y - 20, width: 40, height: 40 };
    }
  }

  return [pRect, qRect];
}
