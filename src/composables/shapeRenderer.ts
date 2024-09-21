import { Shape, StrokeStyle } from "../models";
import { DocOutput } from "../models/document";
import { getShapeTextBounds, hasStrokeStyle } from "../shapes";
import { GroupShape, isGroupShape } from "../shapes/group";
import { splitList } from "../utils/commons";
import { expandRect, getRectPoints } from "../utils/geometry";
import { applyPath } from "../utils/renderer";
import { applyStrokeStyle } from "../utils/strokeStyle";
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
      return !mergedShapeMap[c.id].clipping;
    });

    if (!isParentGroup || clips.length === 0) {
      others.forEach((c) => renderShapeTreeStep(ctx, c));
      return;
    }

    clipWithinGroup(option.shapeComposite, shape, clips, others, ctx, () => {
      others.forEach((c) => renderShapeTreeStep(ctx, c));
    });
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
  others: TreeNode[],
  ctx: CanvasRenderingContext2D,
  renderMain: () => void,
) {
  const regions: [Path2D, StrokeStyle?, cropClipBorder?: boolean][] = [];
  let shouldStroke = false;
  clips.forEach((c) => {
    const rootChildShape = shapeComposite.shapeMap[c.id];

    shapeComposite.getAllBranchMergedShapes([c.id]).forEach((s) => {
      const subRegion = shapeComposite.clip(s);
      if (subRegion) {
        if (hasStrokeStyle(s) && !s.stroke.disabled) {
          regions.push([subRegion, s.stroke, rootChildShape.cropClipBorder]);
          shouldStroke = true;
        } else {
          regions.push([subRegion]);
        }
      }
    });
  });
  if (regions.length === 0) {
    renderMain();
    return;
  }

  const clipOutside = () => {
    const otherRegion: Path2D = new Path2D();
    others.forEach((c) => {
      shapeComposite.getAllBranchMergedShapes([c.id]).forEach((s) => {
        const subRegion = shapeComposite.clip(s);
        if (subRegion) {
          otherRegion.addPath(subRegion);
        }
      });
    });
    ctx.clip(otherRegion);
  };

  const renderOutline = () => {
    let currentCrop = false;

    regions.forEach(([subRegion, stroke, cropClipBorder]) => {
      if (stroke) {
        if (currentCrop === !cropClipBorder) {
          if (cropClipBorder) {
            ctx.save();
            clipOutside();
          } else {
            ctx.restore();
          }
          currentCrop = !!cropClipBorder;
        }

        applyStrokeStyle(ctx, stroke);
        ctx.stroke(subRegion);
      }
    });

    if (currentCrop) {
      ctx.restore();
    }
  };

  const clipOut = () => {
    const wrapperRegion = new Path2D();
    const wrapperRect = expandRect(shapeComposite.getWrapperRect(groupShape, true), 100);
    applyPath(wrapperRegion, getRectPoints(wrapperRect).reverse(), true);
    regions.forEach(([subRegion]) => {
      const combinedPath = new Path2D();
      combinedPath.addPath(subRegion);
      combinedPath.addPath(wrapperRegion);
      ctx.clip(combinedPath);
    });
  };

  if (groupShape.clipRule === "in") {
    const region = new Path2D();
    regions.forEach(([subRegion]) => {
      region.addPath(subRegion);
    });
    ctx.save();
    ctx.clip(region);
    renderMain();
    ctx.restore();

    ctx.save();
    clipOut();
    if (shouldStroke) {
      renderOutline();
    }
    ctx.restore();
  } else {
    ctx.save();
    clipOut();
    renderMain();
    if (shouldStroke) {
      renderOutline();
    }
    ctx.restore();
  }
}
