import { IRectangle } from "okageo";
import { Shape, StrokeStyle } from "../models";
import { DocOutput } from "../models/document";
import { getShapeTextBounds } from "../shapes";
import { hasStrokeStyle } from "../shapes/core";
import { GroupShape, isGroupShape } from "../shapes/group";
import { splitList } from "../utils/commons";
import { expandRect, getIsRectHitRectFn, getOverlappedAreaOfRects, getRectPoints } from "../utils/geometry";
import { CanvasCTX } from "../utils/types";
import { applyPath, scaleGlobalAlpha } from "../utils/renderer";
import { applyStrokeStyle } from "../utils/strokeStyle";
import { getDocCompositionInfo, hasDocNoContent, renderDocByComposition } from "../utils/texts/textEditor";
import { TreeNode } from "../utils/tree";
import { CanvasBank, newCanvasBank } from "./canvasBank";
import { ImageStore } from "./imageStore";
import { ShapeComposite } from "./shapeComposite";

// Should avoid making too large canvas that significantly reduces performance.
const MAX_CANVAS_SIZE = 2000;

interface Option {
  shapeComposite: ShapeComposite;
  getDocumentMap?: () => { [id: string]: DocOutput };
  ignoreDocIds?: string[];
  imageStore?: ImageStore;
  scale?: number;
  canvasBank?: CanvasBank;
  targetRect?: IRectangle;
  noTextLod?: boolean;
}

export function newShapeRenderer(option: Option) {
  const shapeComposite = option.shapeComposite;
  const { mergedShapeMap } = shapeComposite;
  const docMap = option.getDocumentMap?.() ?? {};
  const ignoreDocIdSet = new Set(option.ignoreDocIds ?? []);
  const canvasBank = option.canvasBank ?? newCanvasBank();
  const sortedMergedShapeTree = shapeComposite.getSortedMergedShapeTree();

  const ignoreIdSet = new Set<string>();
  if (option.targetRect) {
    const checkFn = getIsRectHitRectFn(option.targetRect);
    // Check root shapes only for simplicity
    sortedMergedShapeTree.forEach((n) => {
      const s = mergedShapeMap[n.id];
      const rect = shapeComposite.getWrapperRect(s, true);
      if (!checkFn(rect)) {
        ignoreIdSet.add(n.id);
      }
    });
  }

  function render(ctx: CanvasCTX) {
    renderShapeTree(ctx, sortedMergedShapeTree);
  }

  function renderShape(ctx: CanvasCTX, id: string) {
    const tree = shapeComposite.mergedShapeTreeMap[id];
    if (!tree) return;
    renderShapeTree(ctx, [tree]);
  }

  function renderShapeTree(ctx: CanvasCTX, treeNodes: TreeNode[]) {
    treeNodes.forEach((n) => {
      if (ignoreIdSet.has(n.id)) return;
      renderShapeTreeStepWithAlpha(ctx, n);
    });
  }

  function renderShapeTreeStepWithAlpha(ctx: CanvasCTX, node: TreeNode) {
    const shape = mergedShapeMap[node.id];
    const alpha = shape.alpha;
    if (alpha === 0) return;
    if (!alpha || alpha === 1) {
      renderShapeTreeStep(ctx, node, shape);
      return;
    }

    canvasBank.beginCanvas((subCanvas) => {
      // Expand the wrapper rect a bit to make sure it accommodates edge part of the shape.
      const shapeRect = expandRect(shapeComposite.getWrapperRect(shape, true), 2);
      // Seek minimal rect to make canvas size as small as possible.
      const rect = option.targetRect ? getOverlappedAreaOfRects([shapeRect, option.targetRect]) : shapeRect;
      if (!rect) return;

      // Adjust the size of sub canvas along with the scale.
      // => This prevents the shape from being blurry in main canvas.
      let invScale = option.scale ? 1 / option.scale : 1;
      const longEdge = Math.max(rect.width, rect.height);
      if (longEdge * invScale > MAX_CANVAS_SIZE) {
        invScale = MAX_CANVAS_SIZE / longEdge;
      }

      // Have to avoid zero-sized canvas, otherwise "drawImage" throws an error.
      // HTMLCanvas converts size value to integer.
      subCanvas.width = Math.max(1, rect.width * invScale);
      subCanvas.height = Math.max(1, rect.height * invScale);
      const subCtx = subCanvas.getContext("2d")!;
      subCtx.reset();
      subCtx.clearRect(0, 0, subCanvas.width, subCanvas.height);
      subCtx.scale(invScale, invScale);
      subCtx.translate(-rect.x, -rect.y);
      renderShapeTreeStep(subCtx, node, shape);
      scaleGlobalAlpha(ctx, alpha, () => {
        ctx.drawImage(subCanvas, 0, 0, subCanvas.width, subCanvas.height, rect.x, rect.y, rect.width, rect.height);
      });
    });
  }

  function renderShapeTreeStep(ctx: CanvasCTX, node: TreeNode, shape: Shape) {
    renderShapeAndDoc(ctx, shape);
    if (node.children.length === 0) return;

    const isParentGroup = isGroupShape(shape);
    const [others, clips] = splitList(node.children, (c) => {
      return !mergedShapeMap[c.id].clipping;
    });

    if (!isParentGroup || clips.length === 0) {
      others.forEach((c) => renderShapeTreeStepWithAlpha(ctx, c));
      return;
    }

    clipWithinGroup(shapeComposite, shape, clips, others, ctx, () => {
      others.forEach((c) => renderShapeTreeStepWithAlpha(ctx, c));
    });
  }

  function renderShapeAndDoc(ctx: CanvasCTX, shape: Shape) {
    shapeComposite.render(ctx, shape, option.imageStore);
    renderDoc(ctx, shape);
  }

  function renderDoc(ctx: CanvasCTX, shape: Shape) {
    const doc = docMap[shape.id];
    if (doc && !ignoreDocIdSet.has(shape.id) && !hasDocNoContent(doc)) {
      ctx.save();
      const bounds = getShapeTextBounds(shapeComposite.getShapeStruct, shape);
      ctx.transform(...bounds.affine);

      const infoCache = shapeComposite.getDocCompositeCache(shape.id, doc);
      const info = infoCache ?? getDocCompositionInfo(doc, ctx, bounds.range.width, bounds.range.height);
      if (!infoCache) {
        shapeComposite.setDocCompositeCache(shape.id, info, doc);
      }

      renderDocByComposition(ctx, info.composition, info.lines, option.noTextLod ? undefined : option.scale);
      ctx.restore();
    }
  }

  return { render, renderShape };
}
export type ShapeRenderer = ReturnType<typeof newShapeRenderer>;

function clipWithinGroup(
  shapeComposite: ShapeComposite,
  groupShape: GroupShape,
  clips: TreeNode[],
  others: TreeNode[],
  ctx: CanvasCTX,
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
      ctx.clip(combinedPath, "evenodd");
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
