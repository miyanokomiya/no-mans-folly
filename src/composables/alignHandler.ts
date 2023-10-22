import { isSame } from "okageo";
import { Shape } from "../models";
import { AlignBoxShape, isAlignBoxShape } from "../shapes/align/alignBox";
import { AlignLayoutNode, alignLayout } from "../utils/layouts/align";
import { flatTree } from "../utils/tree";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { DocOutput } from "../models/document";
import { createShape } from "../shapes";
import { generateKeyBetween } from "fractional-indexing";
import { RectangleShape } from "../shapes/rectangle";

interface AlignHandlerOption {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export function newAlignHandler(option: AlignHandlerOption) {}
export type AlignHandler = ReturnType<typeof newAlignHandler>;

function toLayoutNode(shapeComposite: ShapeComposite, shape: Shape): AlignLayoutNode | undefined {
  const parent = shape.parentId ? shapeComposite.mergedShapeMap[shape.parentId] : undefined;
  const parentId = parent && isAlignBoxShape(parent) ? parent.id : "";

  if (isAlignBoxShape(shape)) {
    const rect = { x: shape.p.x, y: shape.p.y, width: shape.width, height: shape.height };
    return {
      id: shape.id,
      findex: shape.findex,
      parentId,
      type: "box",
      rect,
      direction: shape.direction,
      gap: shape.gap,
    };
  } else {
    const rect = shapeComposite.getWrapperRect(shape);
    return parentId ? { id: shape.id, findex: shape.findex, type: "entity", rect, parentId } : undefined;
  }
}

function toLayoutNodes(shapeComposite: ShapeComposite, rootId: string): AlignLayoutNode[] {
  const root = shapeComposite.mergedShapeTreeMap[rootId];
  const layoutNodes: AlignLayoutNode[] = [];
  flatTree([root]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    const node = toLayoutNode(shapeComposite, s);
    if (node) {
      layoutNodes.push(node);
    }
  });
  return layoutNodes;
}

export function getNextAlignLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const layoutNodes = toLayoutNodes(shapeComposite, rootId);
  const result = alignLayout(layoutNodes);
  const ret: { [id: string]: Partial<Shape> & Partial<AlignBoxShape> } = {};
  result.forEach((r) => {
    const shape = shapeComposite.shapeMap[r.id];
    if (!isSame(r.rect, shape.p)) {
      ret[r.id] = { p: { x: r.rect.x, y: r.rect.y } };
    }
    if (isAlignBoxShape(shape)) {
      if (r.rect.width !== shape.width) {
        ret[r.id].width = r.rect.width;
      }
      if (r.rect.height !== shape.height) {
        ret[r.id].height = r.rect.height;
      }
      if (shape.rotation !== 0) {
        ret[r.id].rotation = 0;
      }
    }
  });

  return ret;
}

export function generateAlignTemplate(
  ctx: Pick<AppCanvasStateContext, "getShapeStruct" | "generateUuid" | "createLastIndex">,
): { shapes: Shape[]; docMap: { [id: string]: DocOutput } } {
  const root = createShape<AlignBoxShape>(ctx.getShapeStruct, "align_box", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(ctx.createLastIndex(), null),
    height: 300,
    direction: 0,
    gap: 10,
  });
  const column0 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(root.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const column1 = createShape<RectangleShape>(ctx.getShapeStruct, "rectangle", {
    id: ctx.generateUuid(),
    findex: generateKeyBetween(column0.findex, null),
    parentId: root.id,
    width: 100,
    height: 100,
  });
  const composite = newShapeComposite({
    shapes: [root, column0, column1],
    getStruct: ctx.getShapeStruct,
  });
  const patch = getNextAlignLayout(composite, root.id);
  const shapes = composite.shapes.map((s) => ({ ...s, ...patch[s.id] }));

  return { shapes, docMap: {} };
}
