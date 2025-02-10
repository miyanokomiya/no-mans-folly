import { add, IRectangle, IVec2, sub } from "okageo";
import { ShapeComposite } from "./shapeComposite";
import { Size } from "../models";

const MARGIN = 20;

export function findBetterShapePositionsNearByShape(
  shapeComposite: ShapeComposite,
  srcId: string,
  targetIds: string[],
  margin = MARGIN,
): IVec2[] {
  const shapeMap = shapeComposite.mergedShapeMap;
  const rectInfoList = targetIds.map<[string, IRectangle, p: IVec2]>((id) => {
    const s = shapeMap[id];
    const rect = shapeComposite.getWrapperRect(s);
    return [id, rect, s.p];
  });
  const targetW = Math.max(...rectInfoList.map(([, r]) => r.width));
  const targetH = rectInfoList.reduce((v, [, r]) => v + r.height, margin * (rectInfoList.length - 1));
  const destinationRect = findBetterRectanglePositionNearByShape(
    shapeComposite,
    srcId,
    { width: targetW, height: targetH },
    margin,
  );

  const x = destinationRect.x;
  let dy = destinationRect.y;
  return rectInfoList.map(([, r, p]) => {
    const y = dy;
    dy += r.height + margin;
    const wrapperP = { x: x, y };
    const v = sub(wrapperP, r);
    return add(p, v);
  });
}

export function findBetterRectanglePositionNearByShape(
  shapeComposite: ShapeComposite,
  srcId: string,
  rectangleSize: Size,
  margin = MARGIN,
): IVec2 {
  const srcRect = shapeComposite.getWrapperRect(shapeComposite.mergedShapeMap[srcId]);
  const targetW = rectangleSize.width;
  const targetH = rectangleSize.height;

  const destinationRect = {
    x: srcRect.x - (targetW + margin * 2),
    y: srcRect.y,
    width: targetW,
    height: targetH,
  };
  return findRectanglePositionAvoidObstacles(shapeComposite, destinationRect, margin);
}

export function findBetterRectanglePositionsBelowShape(
  shapeComposite: ShapeComposite,
  srcId: string,
  rectangleSize: Size,
  margin = MARGIN,
): IVec2 {
  const srcRect = shapeComposite.getWrapperRect(shapeComposite.mergedShapeMap[srcId]);
  const targetW = rectangleSize.width;
  const targetH = rectangleSize.height;
  const destinationRect = {
    x: srcRect.x,
    y: srcRect.y + targetH + margin,
    width: targetW,
    height: targetH,
  };
  return findRectanglePositionAvoidObstacles(shapeComposite, destinationRect, margin);
}

function findRectanglePositionAvoidObstacles(
  shapeComposite: ShapeComposite,
  srcRect: IRectangle,
  margin = MARGIN,
): IVec2 {
  let destinationRect = srcRect;
  let obstacles = shapeComposite.getShapesOverlappingRect(shapeComposite.mergedShapes, destinationRect);
  while (obstacles.length > 0) {
    destinationRect = {
      ...destinationRect,
      y: destinationRect.y + shapeComposite.getWrapperRectForShapes(obstacles).height + margin,
    };
    obstacles = shapeComposite.getShapesOverlappingRect(shapeComposite.mergedShapes, destinationRect);
  }

  return { x: destinationRect.x, y: destinationRect.y };
}
