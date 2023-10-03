import { IRectangle } from "okageo";
import { LineShape } from "../shapes/line";
import { getOptimalElbowBody } from "../utils/elbowLine";
import { ShapeComposite } from "./shapeComposite";

interface Option {
  getShapeComposite: () => ShapeComposite;
}

export function newElbowLineHandler(option: Option) {
  function optimizeElbow(lineShape: LineShape) {
    const [pBounds, qBounds] = getTargetRects(option, lineShape);
    const vertices = getOptimalElbowBody(lineShape.p, lineShape.q, pBounds, qBounds, 30);
    return vertices.map((p) => ({ p }));
  }

  return { optimizeElbow };
}
export type ElbowLineHandler = ReturnType<typeof newElbowLineHandler>;

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
