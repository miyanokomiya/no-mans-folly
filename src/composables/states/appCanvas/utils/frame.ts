import { Shape } from "../../../../models";
import { DocOutput } from "../../../../models/document";
import { createShape } from "../../../../shapes";
import { duplicateShapes } from "../../../../shapes/utils/duplicator";
import { generateKeyBetweenAllowSame } from "../../../../utils/findex";
import { getAllShapeIdsOnTheFrameOrFrameGroup } from "../../../frame";
import { getNextShapeComposite } from "../../../shapeComposite";
import { getPatchByLayouts } from "../../../shapeLayoutHandler";
import { findBetterRectanglePositionsBelowShape } from "../../../shapePosition";
import { getNextSiblingId } from "../../../shapeRelation";
import { AppCanvasStateContext } from "../core";

/**
 * Returned shape's findex is the one between the target's and the next sibling's.
 * This function doesn't proc shape layouts.
 */
export function insertFrameTreeItem(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite" | "generateUuid">,
  targetId: string,
): Shape {
  const shapeComposite = ctx.getShapeComposite();
  const src = shapeComposite.shapeMap[targetId];
  const nextId = getNextSiblingId(shapeComposite, targetId);
  const nextShape = nextId ? shapeComposite.shapeMap[nextId] : undefined;
  return createShape(shapeComposite.getShapeStruct, src.type, {
    ...src,
    id: ctx.generateUuid(),
    findex: generateKeyBetweenAllowSame(src.findex, nextShape?.findex),
    p: { x: src.p.x, y: src.p.y + shapeComposite.getWrapperRect(src).height + 50 },
  });
}

/**
 * The first item of returned shapes should be duplicated source shape.
 */
export function duplicateFrameTreeItem(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite" | "getDocumentMap" | "generateUuid" | "createLastIndex">,
  srcId: string,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const shapeComposite = ctx.getShapeComposite();
  const src = shapeComposite.shapeMap[srcId];
  const nextId = getNextSiblingId(shapeComposite, srcId);
  const nextShape = nextId ? shapeComposite.shapeMap[nextId] : undefined;
  const branchIds = getAllShapeIdsOnTheFrameOrFrameGroup(shapeComposite, srcId);
  const availableIdSet = new Set(shapeComposite.shapes.map((s) => s.id));
  const duplicated = duplicateShapes(
    shapeComposite.getShapeStruct,
    [src, ...branchIds.map((id) => shapeComposite.shapeMap[id])],
    Object.entries(ctx.getDocumentMap()),
    ctx.generateUuid,
    ctx.createLastIndex(),
    availableIdSet,
    findBetterRectanglePositionsBelowShape(shapeComposite, src.id, shapeComposite.getWrapperRect(src)),
    true,
  );
  const [duplicatedSrc, ...others] = duplicated.shapes;
  const adjusted = [
    { ...duplicatedSrc, findex: generateKeyBetweenAllowSame(src.findex, nextShape?.findex) },
    ...others,
  ];
  if (!shapeComposite.hasParent(src)) return { shapes: adjusted, docMap: duplicated.docMap };

  // Need to proc layouts here when the src shape has a parent.
  // => Newly added shapes can't move along with newly added frames.
  // => Because layouts have to assume newly added ones already have valid positions, but it's hardly guaranteed.
  const tmpShapeComposite = getNextShapeComposite(shapeComposite, { add: adjusted });
  const layoutPatch = getPatchByLayouts(tmpShapeComposite, { update: { [duplicatedSrc.id]: {} } });
  return {
    shapes: adjusted.map((s) => (layoutPatch?.[s.id] ? { ...s, ...layoutPatch[s.id] } : s)),
    docMap: duplicated.docMap,
  };
}
