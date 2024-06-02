import { IRectangle, IVec2, add, getRadian, multi } from "okageo";
import { LineBodyItem, LineShape } from "../shapes/line";
import { getOptimalElbowBody } from "../utils/elbowLine";
import { ShapeComposite } from "./shapeComposite";

interface Option {
  getShapeComposite: () => ShapeComposite;
}

export function newElbowLineHandler(option: Option) {
  function optimizeElbow(lineShape: LineShape): LineBodyItem[] {
    const [pBounds, qBounds] = getTargetRects(option, lineShape);
    const vertices = getOptimalElbowBody(lineShape.p, lineShape.q, pBounds, qBounds, 30);
    return vertices.map((p) => ({ p }));
  }

  return { optimizeElbow };
}
export type ElbowLineHandler = ReturnType<typeof newElbowLineHandler>;

export function inheritElbowExtraDistance(lineShape: LineShape, nextBodyvertices: IVec2[]): LineBodyItem[] {
  const srcBody = lineShape.body;
  if (!srcBody || srcBody.length === 0) {
    return nextBodyvertices.map((p) => ({ p }));
  }

  const ret: LineBodyItem[] = [];
  let v: IVec2 | undefined;

  for (let i = 0; i < nextBodyvertices.length; i++) {
    const p0 = v ? add(nextBodyvertices[i], v) : nextBodyvertices[i];
    const d = srcBody[i]?.d;
    if (d && i < nextBodyvertices.length - 1) {
      const p1 = nextBodyvertices[i + 1];
      const r = getRadian(p1, p0) + Math.PI / 2;
      v = multi({ x: Math.cos(r), y: Math.sin(r) }, d);
      ret.push({ p: add(p0, v), d });
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
