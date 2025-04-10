import { AssetAPI } from "../hooks/persistence";
import { Shape, StrokeStyle } from "../models";
import { DocOutput } from "../models/document";
import { getShapeTextBounds } from "../shapes";
import { hasStrokeStyle } from "../shapes/core";
import { blobToBase64 } from "../utils/fileAccess";
import { createTemplateShapeEmbedElement } from "../shapes/utils/shapeTemplateUtil";
import { createSVGElement, createSVGSVGElement, renderTransform, SVGElementOption } from "../utils/svgElements";
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
import { CanvasCTX } from "../utils/types";

type Option = {
  shapeComposite: ShapeComposite;
  getDocumentMap: () => { [id: string]: DocOutput };
  imageStore?: ImageStore;
  assetAPI: AssetAPI;
} & SVGElementOption;

export function newShapeSVGRenderer(option: Option) {
  const { mergedShapeMap } = option.shapeComposite;
  const docMap = option.getDocumentMap();
  const sortedMergedShapeTree = option.shapeComposite.getSortedMergedShapeTree();

  async function render(ctx: CanvasCTX): Promise<SVGSVGElement> {
    const root = createSVGSVGElement();
    renderShapeTree(root, ctx, sortedMergedShapeTree);

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

  function renderShapeTree(root: SVGElement, ctx: CanvasCTX, treeNodes: TreeNode[]) {
    treeNodes.forEach((n) => renderShapeTreeStep(root, ctx, n));
  }

  function renderShapeTreeStep(root: SVGElement, ctx: CanvasCTX, node: TreeNode) {
    const shape = mergedShapeMap[node.id];
    const elm = renderShapeAndDoc(ctx, shape);
    if (elm) {
      if (shape.alpha && shape.alpha !== 1) {
        elm.setAttribute("opacity", `${shape.alpha}`);
      }
      root.appendChild(elm);
    }
    if (node.children.length === 0) return;

    if (!elm || !isGroupShape(shape)) {
      // Avoid nesting children when the shape isn't a group.
      // Only group shapes can work as <g> elements.
      node.children.forEach((c) => renderShapeTreeStep(root, ctx, c));
      return;
    }

    const [others, clips] = splitList(node.children, (c) => {
      return !mergedShapeMap[c.id].clipping;
    });

    if (clips.length === 0) {
      others.forEach((c) => renderShapeTreeStep(elm, ctx, c));
      return;
    }

    clipWithinGroup(option.shapeComposite, shape, clips, others, root, elm, () => {
      others.forEach((c) => renderShapeTreeStep(elm, ctx, c));
    });
  }

  function renderShapeAndDoc(ctx: CanvasCTX, shape: Shape): SVGElement | undefined {
    const doc = docMap[shape.id];
    return createShapeElement(option, ctx, shape, doc);
  }

  async function renderWithMeta(ctx: CanvasCTX): Promise<SVGSVGElement> {
    const root = await render(ctx);

    // Embed shape data to the SVG.
    const targets = option.shapeComposite.getAllBranchMergedShapes(sortedMergedShapeTree.map((t) => t.id));
    const docs: [string, DocOutput][] = targets.filter((s) => !!docMap[s.id]).map((s) => [s.id, docMap[s.id]]);
    root.appendChild(createTemplateShapeEmbedElement({ shapes: targets, docs }));

    return root;
  }

  return { render, renderWithMeta };
}
export type ShapeSVGRenderer = ReturnType<typeof newShapeSVGRenderer>;

function createShapeElement(option: Option, ctx: CanvasCTX, shape: Shape, doc?: DocOutput): SVGElement | undefined {
  const shapeElmInfo = option.shapeComposite.createSVGElementInfo(shape, option.imageStore);
  if (!shapeElmInfo) return;

  if (!doc || hasDocNoContent(doc)) {
    const shapeElm = createSVGElement(shapeElmInfo.tag, shapeElmInfo.attributes, shapeElmInfo.children, option);
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
  const wrapperElm = createSVGElement("g", undefined, [shapeElmInfo, docElmInfo], option);
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
  const pathList: [string, id: string, StrokeStyle?, cropClipBorder?: boolean][] = [];
  let shouldStroke = false;
  clips.forEach((c) => {
    const rootChildShape = shapeComposite.shapeMap[c.id];

    shapeComposite.getAllBranchMergedShapes([c.id]).forEach((s) => {
      const pathStr = shapeComposite.createClipSVGPath(s);
      if (pathStr) {
        if (hasStrokeStyle(s) && !s.stroke.disabled) {
          pathList.push([pathStr, s.id, s.stroke, rootChildShape.cropClipBorder]);
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

  const clipOutsideElmId = `clip-${groupShape.id}-outside`;

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

    const clipPath = createClipPathElementIn(pathStrList);
    clipPath.id = clipOutsideElmId;
    return clipPath;
  };

  const renderOutline = (): SVGElement => {
    const g = createSVGElement("g");
    pathList.forEach(([pathStr, , stroke, cropClipBorder]) => {
      if (stroke) {
        const pathElm = createSVGElement("path", {
          d: pathStr,
          fill: "none",
          ...renderStrokeSVGAttributes(stroke),
        });

        if (cropClipBorder) {
          pathElm.setAttribute("clip-path", `url(#${clipOutsideElmId})`);
        }

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
      const pathElm = createSVGElement("path", { d: `${pathStr} ${wrapperPathStr}`, "clip-rule": "evenodd" });
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
      if (outlineG.childNodes.length > 0) {
        const clipPathId = embedClipOut();
        if (clipPathId) {
          // Clip out the outline within the clipping shapes.
          outlineG.setAttribute("clip-path", `url(#${clipPathId})`);
        }
        root.appendChild(outlineG);
        const clipOutsideElm = renderClipOutside();
        root.appendChild(clipOutsideElm);
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
      if (outlineG.childNodes.length > 0) {
        // Put outline element in the same parent group of sahpes to clip out in the same way.
        groupElm.appendChild(outlineG);
        const clipOutsideElm = renderClipOutside();
        root.appendChild(clipOutsideElm);
      }
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
