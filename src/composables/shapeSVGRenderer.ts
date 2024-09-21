import { AssetAPI } from "../hooks/persistence";
import { Shape, StrokeStyle } from "../models";
import { DocOutput } from "../models/document";
import { getShapeTextBounds, hasStrokeStyle } from "../shapes";
import { blobToBase64 } from "../utils/fileAccess";
import { createTemplateShapeEmbedElement } from "../shapes/utils/shapeTemplateUtil";
import { createSVGElement, createSVGSVGElement, renderTransform } from "../utils/svgElements";
import { getDocCompositionInfo, hasDocNoContent, renderSVGDocByComposition } from "../utils/textEditor";
import { TreeNode } from "../utils/tree";
import { ImageStore } from "./imageStore";
import { ShapeComposite } from "./shapeComposite";
import { GroupShape, isGroupShape } from "../shapes/group";
import { splitList } from "../utils/commons";
import { expandRect, getRectPoints } from "../utils/geometry";
import { createSVGCurvePath } from "../utils/renderer";
import { pathSegmentRawsToString } from "okageo";
import { renderStrokeSVGAttributes } from "../utils/strokeStyle";

interface Option {
  shapeComposite: ShapeComposite;
  getDocumentMap: () => { [id: string]: DocOutput };
  imageStore?: ImageStore;
  assetAPI: AssetAPI;
}

export function newShapeSVGRenderer(option: Option) {
  const { mergedShapeMap, mergedShapeTree } = option.shapeComposite;
  const docMap = option.getDocumentMap();

  async function render(ctx: CanvasRenderingContext2D): Promise<SVGSVGElement> {
    const root = createSVGSVGElement();
    renderShapeTree(root, ctx, mergedShapeTree);

    // Gather asset files used in the SVG.
    const assetDataMap = new Map<string, { width: number; height: number; base64: string }>();
    for (const elm of root.querySelectorAll("use[href]")) {
      if (!option.assetAPI?.enabled) {
        // TODO: Show warning message: "assetAPI" isn't available.
        throw new Error(`Asset API is unavailable.`);
      }

      const useElm = elm as SVGUseElement;
      const assetId = useElm.href.baseVal.slice(1);
      const assetData = option.imageStore?.getImageData(assetId);
      if (!assetData) {
        throw new Error(`Not found image data: ${assetId}.`);
      }

      try {
        const assetFile = await option.assetAPI.loadAsset(assetId);
        if (!assetFile) {
          throw new Error(`Not found image data: ${assetId}.`);
        }

        const base64 = await blobToBase64(assetFile, true);
        assetDataMap.set(assetId, { width: assetData.img.width, height: assetData.img.height, base64 });
      } catch (e: any) {
        console.error(e);
        throw new Error(`Failed to load image file: ${assetId}. ${e.message}`);
      }
    }

    // Embed asset files in a def tag.
    const assetDef = createSVGElement("def");
    for (const [assetId, data] of assetDataMap.entries()) {
      const imageElm = createSVGElement("image", {
        id: assetId,
        href: data.base64,
        width: data.width,
        height: data.height,
      });
      assetDef.appendChild(imageElm);
    }

    if (assetDef.children.length > 0) {
      root.prepend(assetDef);
    }

    return root;
  }

  function renderShapeTree(root: SVGElement, ctx: CanvasRenderingContext2D, treeNodes: TreeNode[]) {
    treeNodes.forEach((n) => renderShapeTreeStep(root, ctx, n));
  }

  function renderShapeTreeStep(root: SVGElement, ctx: CanvasRenderingContext2D, node: TreeNode) {
    const shape = mergedShapeMap[node.id];
    const elm = renderShapeAndDoc(ctx, shape);
    if (elm) {
      root.appendChild(elm);
    }
    if (node.children.length === 0) return;

    const parentElm = elm ?? root;
    const isParentGroup = isGroupShape(shape);
    const [others, clips] = splitList(node.children, (c) => {
      return !mergedShapeMap[c.id].clipping;
    });

    if (!elm || !isParentGroup || clips.length === 0) {
      others.forEach((c) => renderShapeTreeStep(parentElm, ctx, c));
      return;
    }

    clipWithinGroup(option.shapeComposite, shape, clips, others, root, elm, () => {
      others.forEach((c) => renderShapeTreeStep(parentElm, ctx, c));
    });
  }

  function renderShapeAndDoc(ctx: CanvasRenderingContext2D, shape: Shape): SVGElement | undefined {
    const doc = docMap[shape.id];
    return createShapeElement(option, ctx, shape, doc);
  }

  async function renderWithMeta(ctx: CanvasRenderingContext2D): Promise<SVGSVGElement> {
    const root = await render(ctx);

    // Embed shape data to the SVG.
    const targets = option.shapeComposite.getAllBranchMergedShapes(mergedShapeTree.map((t) => t.id));
    const docs: [string, DocOutput][] = targets.filter((s) => !!docMap[s.id]).map((s) => [s.id, docMap[s.id]]);
    root.appendChild(createTemplateShapeEmbedElement({ shapes: targets, docs }));

    return root;
  }

  return { render, renderWithMeta };
}
export type ShapeSVGRenderer = ReturnType<typeof newShapeSVGRenderer>;

function createShapeElement(
  option: Option,
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  doc?: DocOutput,
): SVGElement | undefined {
  const shapeElmInfo = option.shapeComposite.createSVGElementInfo(shape, option.imageStore);
  if (!shapeElmInfo) return;

  if (!doc || hasDocNoContent(doc)) {
    const shapeElm = createSVGElement(shapeElmInfo.tag, shapeElmInfo.attributes, shapeElmInfo.children);
    return shapeElm;
  }

  const bounds = getShapeTextBounds(option.shapeComposite.getShapeStruct, shape);

  const infoCache = option.shapeComposite.getDocCompositeCache(shape.id, doc);
  const docInfo = infoCache ?? getDocCompositionInfo(doc, ctx, bounds.range.width, bounds.range.height);

  const docElmInfo = renderSVGDocByComposition(docInfo.composition, docInfo.lines);
  const transform = renderTransform(bounds.affine);
  if (transform) {
    docElmInfo.attributes ??= {};
    docElmInfo.attributes.transform = renderTransform(bounds.affine);
  }
  const wrapperElm = createSVGElement("g", undefined, [shapeElmInfo, docElmInfo]);
  return wrapperElm;
}

function clipWithinGroup(
  shapeComposite: ShapeComposite,
  groupShape: GroupShape,
  clips: TreeNode[],
  others: TreeNode[],
  root: SVGElement,
  groupElm: SVGElement,
  renderMain: () => void,
) {
  const pathList: [string, id: string, StrokeStyle?][] = [];
  let shouldStroke = false;
  clips.forEach((c) => {
    shapeComposite.getAllBranchMergedShapes([c.id]).forEach((s) => {
      const pathStr = shapeComposite.createClipSVGPath(s);
      if (pathStr) {
        if (hasStrokeStyle(s) && !s.stroke.disabled) {
          pathList.push([pathStr, s.id, s.stroke]);
          shouldStroke = true;
        } else {
          pathList.push([pathStr, s.id]);
        }
      }
    });
  });
  if (clips.length === 0) {
    renderMain();
    return;
  }

  const renderClipOutside = (): SVGElement => {
    const pathStrList: string[] = [];
    others.forEach((c) => {
      shapeComposite.getAllBranchMergedShapes([c.id]).forEach((s) => {
        const pathStr = shapeComposite.createClipSVGPath(s);
        if (pathStr) {
          pathStrList.push(pathStr);
        }
      });
    });

    const clipPathId = `clip-${groupShape.id}-outside`;
    const clipPath = createClipPathElementIn(pathStrList);
    clipPath.id = clipPathId;
    return clipPath;
  };

  const renderOutline = (): SVGElement => {
    const g = createSVGElement("g");
    pathList.forEach(([pathStr, , stroke]) => {
      if (stroke) {
        const pathElm = createSVGElement("path", {
          d: pathStr,
          fill: "none",
          ...renderStrokeSVGAttributes(stroke),
        });
        g.appendChild(pathElm);
      }
    });
    return g;
  };

  const embedClipOut = (): string | undefined => {
    const wrapperRect = expandRect(shapeComposite.getWrapperRect(groupShape, true), 100);
    const wrapperPath = getRectPoints(wrapperRect).reverse();
    const wrapperPathStr = pathSegmentRawsToString(createSVGCurvePath(wrapperPath, undefined, true));
    let lastClipPath: SVGElement | undefined;
    pathList.forEach(([pathStr, id]) => {
      if (!pathStr) return;

      const clipPathId = `clip-${groupShape.id}-${id}`;
      const clipPath = createSVGElement("clipPath", { id: clipPathId });
      const pathElm = createSVGElement("path", { d: `${pathStr} ${wrapperPathStr}` });
      clipPath.appendChild(pathElm);
      if (lastClipPath) {
        clipPath.setAttribute("clip-path", `url(#${lastClipPath.id})`);
      }
      root.appendChild(clipPath);
      lastClipPath = clipPath;
    });

    return lastClipPath?.id;
  };

  if (groupShape.clipRule === "in") {
    const clipPathId = `clip-${groupShape.id}`;
    const clipPath = createClipPathElementIn(pathList.map(([pathStr]) => pathStr));
    clipPath.id = clipPathId;
    root.appendChild(clipPath);
    groupElm.setAttribute("clip-path", `url(#${clipPathId})`);

    renderMain();

    if (shouldStroke) {
      const outlineG = renderOutline();
      if (outlineG) {
        const clipOutsideElm = renderClipOutside();
        const clipPathId = embedClipOut();
        if (clipPathId) {
          clipOutsideElm.setAttribute("clip-path", `url(#${clipPathId})`);
        }
        outlineG.setAttribute("clip-path", `url(#${clipOutsideElm.id})`);
        root.appendChild(clipOutsideElm);
        root.appendChild(outlineG);
      }
    }
  } else {
    const clipPathId = embedClipOut();
    if (clipPathId) {
      groupElm.setAttribute("clip-path", `url(#${clipPathId})`);
    }

    renderMain();

    if (shouldStroke) {
      const outlineG = renderOutline();
      const clipOutsideElm = renderClipOutside();
      root.appendChild(clipOutsideElm);
      outlineG.setAttribute("clip-path", `url(#${clipOutsideElm.id})`);
      groupElm.appendChild(outlineG);
    }
  }
}

function createClipPathElementIn(pathStrList: string[]): SVGElement {
  const clipPath = createSVGElement("clipPath");
  pathStrList.forEach((pathStr) => {
    if (pathStr) {
      const pathElm = createSVGElement("path", { d: pathStr });
      clipPath.appendChild(pathElm);
    }
  });
  return clipPath;
}
