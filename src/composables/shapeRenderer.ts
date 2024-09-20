import { Shape } from "../models";
import { DocOutput } from "../models/document";
import { getShapeTextBounds } from "../shapes";
import { GroupShape, isGroupShape } from "../shapes/group";
import { splitList } from "../utils/commons";
import { getRectPoints } from "../utils/geometry";
import { applyPath } from "../utils/renderer";
import { getDocCompositionInfo, hasDocNoContent, renderDocByComposition } from "../utils/textEditor";
import { TreeNode } from "../utils/tree";
import { ImageStore } from "./imageStore";
import { ShapeComposite } from "./shapeComposite";

interface Option {
  shapeComposite: ShapeComposite;
  getDocumentMap: () => { [id: string]: DocOutput };
  ignoreDocIds?: string[];
  imageStore?: ImageStore;
  scale?: number;
}

export function newShapeRenderer(option: Option) {
  const { mergedShapeMap, mergedShapeTree } = option.shapeComposite;
  const docMap = option.getDocumentMap();
  const ignoreDocIdSet = new Set(option.ignoreDocIds ?? []);

  function render(ctx: CanvasRenderingContext2D) {
    renderShapeTree(ctx, mergedShapeTree);
  }

  function renderShapeTree(ctx: CanvasRenderingContext2D, treeNodes: TreeNode[]) {
    treeNodes.forEach((n) => renderShapeTreeStep(ctx, n));
  }

  function renderShapeTreeStep(ctx: CanvasRenderingContext2D, node: TreeNode) {
    const shape = mergedShapeMap[node.id];
    renderShapeAndDoc(ctx, shape);
    if (node.children.length === 0) return;

    const isParentGroup = isGroupShape(shape);
    const [others, clips] = splitList(node.children, (c) => {
      return !isParentGroup || !mergedShapeMap[c.id].clipping;
    });

    if (!isParentGroup || clips.length === 0) {
      others.forEach((c) => renderShapeTreeStep(ctx, c));
      return;
    }

    ctx.save();
    clipWithinGroup(option.shapeComposite, shape, clips, ctx);
    others.forEach((c) => renderShapeTreeStep(ctx, c));
    ctx.restore();
  }

  function renderShapeAndDoc(ctx: CanvasRenderingContext2D, shape: Shape) {
    option.shapeComposite.render(ctx, shape, option.imageStore);
    renderDoc(ctx, shape);
  }

  function renderDoc(ctx: CanvasRenderingContext2D, shape: Shape) {
    const doc = docMap[shape.id];
    if (doc && !ignoreDocIdSet.has(shape.id) && !hasDocNoContent(doc)) {
      ctx.save();
      const bounds = getShapeTextBounds(option.shapeComposite.getShapeStruct, shape);
      ctx.transform(...bounds.affine);

      const infoCache = option.shapeComposite.getDocCompositeCache(shape.id, doc);
      const info = infoCache ?? getDocCompositionInfo(doc, ctx, bounds.range.width, bounds.range.height);
      if (!infoCache) {
        option.shapeComposite.setDocCompositeCache(shape.id, info, doc);
      }

      renderDocByComposition(ctx, info.composition, info.lines, option.scale);
      ctx.restore();
    }
  }

  return { render };
}
export type ShapeRenderer = ReturnType<typeof newShapeRenderer>;

function clipWithinGroup(
  shapeComposite: ShapeComposite,
  groupShape: GroupShape,
  clips: TreeNode[],
  ctx: CanvasRenderingContext2D,
) {
  const wrapperRegion = new Path2D();
  applyPath(wrapperRegion, getRectPoints(shapeComposite.getWrapperRect(groupShape, true)).reverse(), true);

  if (groupShape.clipRule === "in") {
    const region = new Path2D();
    let clipped = false;
    clips.forEach((c) => {
      const childShape = shapeComposite.mergedShapeMap[c.id];
      const subRegion = shapeComposite.clip(childShape);
      if (subRegion) {
        region.addPath(subRegion);
        clipped = true;
      }
    });
    if (clipped) {
      ctx.clip(region, "nonzero");
    }
  } else {
    clips.forEach((c) => {
      const childShape = shapeComposite.mergedShapeMap[c.id];
      const subRegion = shapeComposite.clip(childShape);
      if (subRegion) {
        subRegion.addPath(wrapperRegion);
        ctx.clip(subRegion, "nonzero");
      }
    });
  }
}
