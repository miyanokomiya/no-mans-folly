import { IVec2 } from "okageo";
import { EntityPatchInfo, Shape } from "../models";
import { isLineShape, LineShape } from "../shapes/line";
import { getLineEdgeInfo } from "../shapes/utils/line";
import { ShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";

export interface LineAttachmentHandler {
  onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> };
}

interface Option {
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
}

function newLineAttachmentHandler(option: Option): LineAttachmentHandler {
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): { [id: string]: Partial<Shape> } {
    const shapeComposite = option.ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const shapeList = Object.values(shapeMap);
    const updatedEntries = Object.entries(updatedMap);
    const ret: { [id: string]: Partial<Shape> } = {};

    const targetLineIds = new Set(updatedEntries.filter(([id]) => isLineShape(shapeMap[id])).map(([id]) => id));
    const attachedMap = new Map<string, Set<string>>();
    shapeList.forEach((s) => {
      if (!s.attachment) return;
      if (!targetLineIds.has(s.attachment.id)) {
        if (!updatedMap[s.id]) return; // neither the shape nor the line changes

        targetLineIds.add(s.attachment.id);
      }

      const lineId = s.attachment.id;
      const idSet = attachedMap.get(lineId);
      if (idSet) {
        idSet.add(s.id);
      } else {
        attachedMap.set(lineId, new Set([s.id]));
      }
    });

    targetLineIds.forEach((lineId) => {
      const attachedIdSet = attachedMap.get(lineId);
      if (!attachedIdSet || attachedIdSet.size === 0) return;

      const nextLine = { ...shapeMap[lineId], ...updatedMap[lineId] } as LineShape;
      const nextLineLerpFn = getLineEdgeInfo(nextLine).lerpFn;
      attachedIdSet.forEach((attachedId) => {
        const nextAttached = { ...shapeMap[attachedId], ...updatedMap[attachedId] };
        if (!nextAttached.attachment) return;

        const toP = nextLineLerpFn(nextAttached.attachment.to.x);
        const patch = patchByMoveToAttachedPoint(shapeComposite, nextAttached, nextAttached.attachment.anchor, toP);
        if (!patch) return;

        ret[attachedId] = patch;
      });
    });

    return ret;
  }

  return { onModified };
}

export function getLineAttachmentPatch(
  srcComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
): { [id: string]: Partial<Shape> } {
  if (!patchInfo.update) return {};

  const handler = newLineAttachmentHandler({
    ctx: { getShapeComposite: () => srcComposite },
  });
  return handler.onModified(patchInfo.update);
}

export function patchByMoveToAttachedPoint(
  shapeComposite: ShapeComposite,
  shape: Shape,
  anchor: IVec2,
  attachedPoint: IVec2,
): Partial<Shape> | undefined {
  const bounds = shapeComposite.getWrapperRect(shape);
  const anchorP = {
    x: bounds.x + bounds.width * anchor.x,
    y: bounds.y + bounds.height * anchor.y,
  };
  return shapeComposite.transformShape(shape, [1, 0, 0, 1, attachedPoint.x - anchorP.x, attachedPoint.y - anchorP.y]);
}
