import { IVec2, getCenter, getDistance, getPedal, isOnSeg } from "okageo";
import { LineShape, getEdges } from "../shapes/line";
import { TextShape, patchPosition, struct as textStruct } from "../shapes/text";
import { snapAngle } from "./geometry";

export function attachLabelToLine(line: LineShape, label: TextShape): Partial<TextShape> {
  const edges = getEdges(line);
  const labelBounds = textStruct.getWrapperRect(label);
  const labelLocalRect = textStruct.getLocalRectPolygon(label);
  const labelCenter = getCenter(labelLocalRect[0], labelLocalRect[2]);

  const values = edges.map<[number, number, IVec2]>((edge, i) => {
    let pedal = getPedal(labelCenter, edge);
    if (!isOnSeg(pedal, edge)) {
      pedal = getDistance(edge[0], labelCenter) <= getDistance(edge[1], labelCenter) ? edge[0] : edge[1];
    }
    return [i, getDistance(labelCenter, pedal), pedal];
  });
  const closestValue = values.sort((a, b) => a[1] - b[1])[0];
  const closestEdgeIndex = closestValue[0];
  const closestPedal = closestValue[2];

  let patch: Partial<TextShape> = {};

  if (closestPedal.x <= labelBounds.x) {
    patch.hAlign = "left";
  } else if (labelBounds.x + labelBounds.width <= closestPedal.x) {
    patch.hAlign = "right";
  } else {
    patch.hAlign = "center";
  }

  if (closestPedal.y <= labelBounds.y) {
    patch.vAlign = "top";
  } else if (labelBounds.y + labelBounds.height <= closestPedal.y) {
    patch.vAlign = "bottom";
  } else {
    patch.vAlign = "center";
  }

  const dList = edges.map((edge) => getDistance(edge[0], edge[1]));
  const totalD = dList.reduce((n, d) => n + d, 0);
  let d = 0;
  for (let i = 0; i < closestEdgeIndex; i++) {
    d += dList[i];
  }
  d += getDistance(edges[closestEdgeIndex][0], closestPedal);
  patch.lineAttached = d / totalD;

  patch = { ...patch, ...applyRotationToAlign(patch.hAlign, patch.vAlign, label.rotation) };
  patch = { ...patch, ...patchPosition({ ...label, ...patch }, closestPedal) };

  const ret = { ...patch };
  if (ret.hAlign === label.hAlign) {
    delete ret.hAlign;
  }
  if (ret.vAlign === label.vAlign) {
    delete ret.vAlign;
  }
  if (ret.lineAttached === label.lineAttached) {
    delete ret.lineAttached;
  }

  return ret;
}

type AlignInfo = { hAlign: TextShape["hAlign"]; vAlign: TextShape["vAlign"] };

function applyRotationToAlign(
  hAlign: TextShape["hAlign"] = "left",
  vAlign: TextShape["vAlign"] = "top",
  rotation: number
): AlignInfo {
  const snappedRotation = snapAngle((rotation * 180) / Math.PI, 90);
  const index = Math.round(((snappedRotation + 360) % 360) / 90);
  if (index === 1) {
    const ret: AlignInfo = { hAlign: "center", vAlign: "center" };
    if (hAlign === "center") {
      ret.hAlign = vAlign === "top" ? "left" : vAlign === "bottom" ? "right" : "center";
    }
    if (vAlign === "center") {
      ret.vAlign = hAlign === "left" ? "top" : hAlign === "right" ? "bottom" : "center";
    }
    return ret;
  } else if (index === 2) {
    return {
      hAlign: hAlign === "left" ? "right" : hAlign === "right" ? "left" : "center",
      vAlign: vAlign === "top" ? "bottom" : vAlign === "bottom" ? "top" : "center",
    };
  } else if (index === 3) {
    const ret: AlignInfo = { hAlign: "center", vAlign: "center" };
    if (hAlign === "center") {
      ret.hAlign = vAlign === "top" ? "right" : vAlign === "bottom" ? "left" : "center";
    }
    if (vAlign === "center") {
      ret.vAlign = hAlign === "left" ? "top" : hAlign === "right" ? "bottom" : "center";
    }
    return ret;
  }

  return { hAlign, vAlign };
}
