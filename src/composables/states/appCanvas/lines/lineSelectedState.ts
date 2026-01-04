import {
  getCommonCommandExams,
  handleCommonPointerDownLeftOnSingleSelection,
  handleCommonPointerDownRightOnSingleSelection,
  handleIntransientEvent,
} from "../commons";
import {
  LineShape,
  deleteVertex,
  detachVertex,
  getConnection,
  getConnections,
  getLinePath,
  getRelativePointOn,
  isLineShape,
  patchBodyVertex,
  patchConnection,
  patchVertices,
} from "../../../../shapes/line";
import { isSegmentRelatedHitResult, LineBounding, newLineBounding } from "../../../lineBounding";
import { newMovingLineVertexState } from "./movingLineVertexState";
import { newMovingNewVertexState } from "./movingNewVertexState";
import { newDuplicatingShapesState } from "../duplicatingShapesState";
import { createShape } from "../../../../shapes";
import { TextShape, patchPosition } from "../../../../shapes/text";
import { newTextEditingState } from "../text/textEditingState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { CONTEXT_MENU_ITEM_SRC, getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { getPatchAfterLayouts, getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newMovingLineArcState } from "./movingLineArcState";
import { defineIntransientState } from "../intransientState";
import { newPointerDownEmptyState } from "../pointerDownEmptyState";
import { optimizeLinePath } from "../../../lineSnapping";
import { newMovingElbowSegmentState } from "./movingElbowSegmentState";
import { newElbowLineHandler } from "../../../elbowLineHandler";
import { newMovingLineBezierState } from "./movingLineBezierState";
import { isObjectEmpty } from "../../../../utils/commons";
import { newRotatingState } from "../rotatingState";
import { newBoundingBox } from "../../../boundingBox";
import {
  canConcatLine,
  getShapePatchInfoByInsertingVertexAt,
  getShapePatchInfoBySplittingLineAt,
  patchByFliplineH,
  patchByFliplineV,
} from "../../../../shapes/utils/line";
import { getSegments } from "../../../../utils/geometry";
import { getDistanceSq, IVec2 } from "okageo";
import { ContextMenuItem } from "../../types";
import { AppCanvasState, AppCanvasStateContext } from "../core";
import { VnNodeShape } from "../../../../shapes/vectorNetworks/vnNode";
import { generateFindexAfter, generateFindexBefore } from "../../../shapeRelation";
import { getInheritableVnNodeProperties, patchBySplitAttachingLine, seekNearbyVnNode } from "../../../vectorNetwork";

type VertexMetaForContextMenu = {
  index: number;
};
type SegmentMetaForContextMenu = VertexMetaForContextMenu & { originIndex: 0 | 1 };
type SegmentAtMetaForContextMenu = VertexMetaForContextMenu & { p: IVec2 };

export const newLineSelectedState = defineIntransientState(() => {
  let lineShape: LineShape;
  let lineBounding: LineBounding;

  const render: AppCanvasState["render"] = (ctx, renderCtx) => {
    lineBounding.render(renderCtx, ctx.getScale(), ctx.getViewRect());
  };

  const lineBoundingHitTest = (ctx: AppCanvasStateContext, p: IVec2) => {
    return lineBounding.hitTest(p, ctx.getScale(), ctx.getViewRect());
  };

  return {
    getLabel: () => "LineSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      lineShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as LineShape;
      lineBounding = newLineBounding({
        lineShape,
        styleScheme: ctx.getStyleScheme(),
        shapeComposite: ctx.getShapeComposite(),
      });
      lineBounding.saveHitResult(lineBoundingHitTest(ctx, ctx.getCursorPoint()));
      ctx.setCommandExams([COMMAND_EXAM_SRC.DELETE_INER_VERTX, ...getCommonCommandExams(ctx)]);
    },
    onEnd: (ctx) => {
      ctx.hideFloatMenu();
      ctx.setCommandExams();
      ctx.setContextMenuList();
      ctx.setCursor();
    },
    handleEvent: (ctx, event) => {
      if (!lineShape) return ctx.states.newSelectionHubState;

      switch (event.type) {
        case "pointerdown":
          ctx.setContextMenuList();

          switch (event.data.options.button) {
            case 0: {
              const hitResult = lineBoundingHitTest(ctx, event.data.point);
              if (hitResult) {
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                }

                switch (hitResult.type) {
                  case "extend-and-connect": {
                    const target = hitResult.connection
                      ? ctx.getShapeComposite().shapeMap[hitResult.connection.id]
                      : undefined;
                    if (!target) return ctx.states.newSelectionHubState;

                    const patch = isLineShape(target)
                      ? patchVertices(lineShape, [[hitResult.index, hitResult.p!, undefined]])
                      : patchConnection(lineShape, hitResult.index, hitResult.connection);
                    const layoutPatch = getPatchByLayouts(ctx.getShapeComposite(), {
                      update: { [lineShape.id]: patch },
                    });
                    ctx.patchShapes(layoutPatch);
                    return ctx.states.newSelectionHubState;
                  }
                  case "optimize": {
                    const c = getConnection(lineShape, hitResult.index);
                    if (!c) return;

                    let patch = patchConnection(lineShape, hitResult.index, { optimized: true, ...c });
                    const optimized = optimizeLinePath(ctx, { ...lineShape, ...patch });
                    patch = optimized ? { ...patch, ...optimized } : patch;
                    const layoutPatch = getPatchByLayouts(ctx.getShapeComposite(), {
                      update: { [lineShape.id]: patch },
                    });
                    ctx.patchShapes(layoutPatch);
                    return ctx.states.newSelectionHubState;
                  }
                  case "move-anchor":
                    return ctx.states.newMovingHubState;
                  case "rotate-anchor": {
                    const shapeComposite = ctx.getShapeComposite();
                    const rectPath = shapeComposite.getLocalRectPolygon(lineShape);
                    return () =>
                      newRotatingState({
                        boundingBox: newBoundingBox({
                          path: rectPath,
                        }),
                      });
                  }
                  case "vertex":
                    return () => newMovingLineVertexState({ lineShape, index: hitResult.index });
                  case "segment":
                    if (event.data.options.shift) {
                      return () => ctx.states.newExtrudingLineSegmentState({ lineShape, index: hitResult.index });
                    }
                    return () => ctx.states.newMovingLineSegmentState({ lineShape, index: hitResult.index });
                  case "elbow-edge":
                    return () => newMovingElbowSegmentState({ lineShape, index: hitResult.index });
                  case "new-vertex-anchor":
                    return () =>
                      newMovingNewVertexState({ lineShape, index: hitResult.index + 1, p: event.data.point });
                  case "arc-anchor":
                    return () => newMovingLineArcState({ lineShape, index: hitResult.index, p: event.data.point });
                  case "bezier-anchor":
                  case "new-bezier-anchor":
                    return () =>
                      newMovingLineBezierState({
                        lineShape,
                        index: hitResult.index,
                        subIndex: hitResult.subIndex,
                        p: event.data.point,
                      });
                  case "reset-elbow-edge": {
                    const bodyIndex = hitResult.index - 1;
                    const srcBodyItem = lineShape.body?.[bodyIndex];
                    if (srcBodyItem) {
                      let patch = patchBodyVertex(lineShape, hitResult.index - 1, { ...srcBodyItem, elbow: undefined });
                      const elbowHandler = newElbowLineHandler(ctx);
                      patch = { ...patch, body: elbowHandler.optimizeElbow({ ...lineShape, ...patch }) };
                      const layoutPatch = getPatchByLayouts(ctx.getShapeComposite(), {
                        update: { [lineShape.id]: patch },
                      });
                      ctx.patchShapes(layoutPatch);
                    }
                    return;
                  }
                }
              }

              return handleCommonPointerDownLeftOnSingleSelection(
                ctx,
                event,
                lineShape.id,
                ctx.getShapeComposite().getSelectionScope(lineShape),
                [lineShape.id],
                render,
              );
            }
            case 1:
              return () => newPointerDownEmptyState({ ...event.data.options, renderWhilePanning: render });
            case 2: {
              const hitResult = lineBoundingHitTest(ctx, event.data.point);
              lineBounding.saveHitResult(hitResult);
              if (hitResult) return;

              return handleCommonPointerDownRightOnSingleSelection(
                ctx,
                event,
                lineShape.id,
                ctx.getShapeComposite().getSelectionScope(lineShape),
                [lineShape.id],
              );
            }
            default:
              return;
          }
        case "pointerhover": {
          const hitResult = lineBoundingHitTest(ctx, event.data.current);
          if (lineBounding.saveHitResult(hitResult)) {
            ctx.redraw();
          }
          break;
        }
        case "state":
          switch (event.data.name) {
            case "AddingLineLabel": {
              const textshapeSrc = createShape<TextShape>(ctx.getShapeStruct, "text", {
                id: ctx.generateUuid(),
                findex: ctx.createLastIndex(),
                parentId: lineShape.id,
                vAlign: "center",
                hAlign: "center",
                lineAttached: 0.5,
              });
              const textshape = {
                ...textshapeSrc,
                ...patchPosition(textshapeSrc, getRelativePointOn(lineShape, 0.5)),
              };
              ctx.addShapes([textshape]);
              ctx.selectShape(textshape.id);
              return () => newTextEditingState({ id: textshape.id });
            }
            default:
              return handleIntransientEvent(ctx, event);
          }
        case "contextmenu": {
          const hitResult = lineBoundingHitTest(ctx, event.data.point);
          const items: ContextMenuItem[] = [];
          if (hitResult?.type === "vertex") {
            const connection = getConnection(lineShape, hitResult.index);
            items.push({
              ...CONTEXT_MENU_ITEM_SRC.CREATE_VN_NODE,
              meta: { index: hitResult.index } as VertexMetaForContextMenu,
            });

            const vertices = getLinePath(lineShape);
            if (0 < hitResult.index && hitResult.index < vertices.length - 1) {
              items.push({
                ...CONTEXT_MENU_ITEM_SRC.SPLIT_BY_VN_NODE,
                meta: { index: hitResult.index, p: vertices[hitResult.index] } as SegmentAtMetaForContextMenu,
              });
            } else if (canConcatLine(lineShape)) {
              items.push({
                ...CONTEXT_MENU_ITEM_SRC.COMBINE_LINES,
                meta: { index: hitResult.index } as VertexMetaForContextMenu,
              });
            }

            items.push({
              ...CONTEXT_MENU_ITEM_SRC.ATTACH_LINE_VERTEX,
              meta: { index: hitResult.index } as VertexMetaForContextMenu,
            });

            if (connection) {
              items.push({
                ...CONTEXT_MENU_ITEM_SRC.DETACH_LINE_VERTEX,
                meta: { index: hitResult.index } as VertexMetaForContextMenu,
              });
            }
            items.push(
              {
                ...CONTEXT_MENU_ITEM_SRC.DELETE_LINE_VERTEX,
                meta: { index: hitResult.index } as VertexMetaForContextMenu,
              },
              CONTEXT_MENU_ITEM_SRC.SEPARATOR,
            );
          } else if (hitResult && isSegmentRelatedHitResult(hitResult)) {
            const segs = getSegments(getLinePath(lineShape));
            if (0 <= hitResult.index && hitResult.index < segs.length) {
              const seg = segs[hitResult.index];
              const originIndex =
                getDistanceSq(seg[0], event.data.point) <= getDistanceSq(seg[1], event.data.point) ? 1 : 0;

              items.push(
                {
                  ...CONTEXT_MENU_ITEM_SRC.INSERT_VN_NODE,
                  meta: { index: hitResult.index, p: event.data.point } as SegmentAtMetaForContextMenu,
                },
                {
                  ...CONTEXT_MENU_ITEM_SRC.SPLIT_BY_VN_NODE,
                  meta: { index: hitResult.index, p: event.data.point } as SegmentAtMetaForContextMenu,
                },
                CONTEXT_MENU_ITEM_SRC.SEPARATOR,
                {
                  ...CONTEXT_MENU_ITEM_SRC.REFINE_SEGMENT,
                  meta: { index: hitResult.index, originIndex } as SegmentMetaForContextMenu,
                },
                CONTEXT_MENU_ITEM_SRC.SEPARATOR,
              );
            }
          }

          const connections = getConnections(lineShape);
          const hasConnection = connections.some((c) => c);

          ctx.setContextMenuList({
            items: [
              ...items,
              CONTEXT_MENU_ITEM_SRC.ATTACH_LINE_VERTICES,
              ...(hasConnection ? [CONTEXT_MENU_ITEM_SRC.DETACH_LINE_VERTICES] : []),
              CONTEXT_MENU_ITEM_SRC.FLIP_LINE_H,
              CONTEXT_MENU_ITEM_SRC.FLIP_LINE_V,
              CONTEXT_MENU_ITEM_SRC.SEPARATOR,
              ...getMenuItemsForSelectedShapes(ctx),
            ],
            point: event.data.point,
          });
          return;
        }
        case "contextmenu-item": {
          switch (event.data.key) {
            case CONTEXT_MENU_ITEM_SRC.DELETE_LINE_VERTEX.key: {
              const patch = deleteVertex(lineShape, (event.data.meta as VertexMetaForContextMenu).index);
              if (!isObjectEmpty(patch)) {
                ctx.patchShapes(getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [lineShape.id]: patch } }));
              }
              return ctx.states.newSelectionHubState;
            }
            case CONTEXT_MENU_ITEM_SRC.DETACH_LINE_VERTEX.key: {
              const patch = detachVertex(lineShape, (event.data.meta as VertexMetaForContextMenu).index);
              if (!isObjectEmpty(patch)) {
                ctx.patchShapes(getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [lineShape.id]: patch } }));
              }
              return ctx.states.newSelectionHubState;
            }
            case CONTEXT_MENU_ITEM_SRC.CREATE_VN_NODE.key: {
              const index = (event.data.meta as VertexMetaForContextMenu).index;
              const sc = ctx.getShapeComposite();
              const p = getLinePath(lineShape)[index];
              const vnnode = createShape<VnNodeShape>(ctx.getShapeStruct, "vn_node", {
                ...getInheritableVnNodeProperties(seekNearbyVnNode(sc, [lineShape.id])),
                id: ctx.generateUuid(),
                findex: ctx.createLastIndex(),
                p,
              });
              ctx.updateShapes({
                add: [vnnode],
                update: {
                  [lineShape.id]: patchConnection(lineShape, index, { id: vnnode.id, rate: { x: 0.5, y: 0.5 } }),
                },
              });
              ctx.selectShape(vnnode.id);
              return ctx.states.newSelectionHubState;
            }
            case CONTEXT_MENU_ITEM_SRC.INSERT_VN_NODE.key: {
              const { index, p } = event.data.meta as SegmentAtMetaForContextMenu;
              const insertPatch = getShapePatchInfoByInsertingVertexAt(lineShape, index, p, 10 * ctx.getScale());
              if (!insertPatch) return;

              const sc = ctx.getShapeComposite();
              const vnnodeId = ctx.generateUuid();
              const vnnode = createShape<VnNodeShape>(ctx.getShapeStruct, "vn_node", {
                ...getInheritableVnNodeProperties(seekNearbyVnNode(sc, [lineShape.id])),
                id: vnnodeId,
                findex: generateFindexAfter(sc, lineShape.id),
                p: insertPatch[0].body?.[index].p,
              });

              ctx.updateShapes({
                add: [vnnode],
                update: {
                  [lineShape.id]: {
                    ...insertPatch[0],
                    body: insertPatch[0].body?.map((b, i) => {
                      if (i !== index) return b;
                      return { ...b, c: { id: vnnodeId, rate: { x: 0.5, y: 0.5 } } };
                    }),
                  } as Partial<LineShape>,
                },
              });
              ctx.selectShape(vnnode.id);
              return ctx.states.newSelectionHubState;
            }
            case CONTEXT_MENU_ITEM_SRC.SPLIT_BY_VN_NODE.key: {
              const { index, p } = event.data.meta as SegmentAtMetaForContextMenu;
              const splitPatch = getShapePatchInfoBySplittingLineAt(lineShape, index, p, 10 * ctx.getScale());
              if (!splitPatch) return;

              const sc = ctx.getShapeComposite();
              const vnnodeId = ctx.generateUuid();
              const newLine = createShape<LineShape>(ctx.getShapeStruct, "line", {
                ...splitPatch[0],
                id: ctx.generateUuid(),
                findex: generateFindexBefore(sc, lineShape.id),
                pConnection: { id: vnnodeId, rate: { x: 0.5, y: 0.5 } },
              });
              const vnnode = createShape<VnNodeShape>(ctx.getShapeStruct, "vn_node", {
                ...getInheritableVnNodeProperties(seekNearbyVnNode(sc, [lineShape.id])),
                id: vnnodeId,
                findex: generateFindexAfter(sc, lineShape.id),
                p: newLine.p,
              });

              // Adjust attached shapes.
              const attachingPatch = patchBySplitAttachingLine(sc, lineShape.id, [[newLine.id, splitPatch[2]]]);

              ctx.updateShapes({
                add: [newLine, vnnode],
                update: {
                  ...attachingPatch,
                  [lineShape.id]: {
                    ...splitPatch[1],
                    qConnection: { id: vnnodeId, rate: { x: 0.5, y: 0.5 } },
                  } as Partial<LineShape>,
                },
              });
              ctx.selectShape(vnnode.id);
              return ctx.states.newSelectionHubState;
            }
            case CONTEXT_MENU_ITEM_SRC.COMBINE_LINES.key: {
              return () =>
                ctx.states.newLineCombineState({
                  lineShape,
                  tail: (event.data.meta as VertexMetaForContextMenu).index !== 0,
                });
            }
            case CONTEXT_MENU_ITEM_SRC.ATTACH_LINE_VERTEX.key: {
              return () =>
                ctx.states.newVertexAttachingState({
                  lineShape,
                  index: (event.data.meta as VertexMetaForContextMenu).index,
                });
            }
            case CONTEXT_MENU_ITEM_SRC.REFINE_SEGMENT.key: {
              const meta = event.data.meta as SegmentMetaForContextMenu;
              return () =>
                ctx.states.newLineSegmentEditingState({
                  lineShape,
                  index: meta.index,
                  originIndex: meta.originIndex,
                });
            }
            case CONTEXT_MENU_ITEM_SRC.ATTACH_LINE_VERTICES.key: {
              return () => ctx.states.newVertexAttachingState({ lineShape });
            }
            case CONTEXT_MENU_ITEM_SRC.DETACH_LINE_VERTICES.key: {
              const patchInfo = getLinePath(lineShape).map<[number, IVec2, undefined]>((v, i) => [i, v, undefined]);
              const patch = patchVertices(lineShape, patchInfo);
              ctx.patchShapes({ [lineShape.id]: patch });
              return ctx.states.newSelectionHubState;
            }
            case CONTEXT_MENU_ITEM_SRC.FLIP_LINE_H.key: {
              const patch = patchByFliplineH(lineShape);
              if (!isObjectEmpty(patch)) {
                ctx.patchShapes(getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [lineShape.id]: patch } }));
              }
              return ctx.states.newSelectionHubState;
            }
            case CONTEXT_MENU_ITEM_SRC.FLIP_LINE_V.key: {
              const patch = patchByFliplineV(lineShape);
              if (!isObjectEmpty(patch)) {
                ctx.patchShapes(getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [lineShape.id]: patch } }));
              }
              return ctx.states.newSelectionHubState;
            }
            default:
              return handleIntransientEvent(ctx, event);
          }
        }
        case "shape-highlight": {
          if (event.data.id !== lineShape.id) return;

          switch (event.data.meta.type) {
            case "vertex":
            case "segment":
            case "bezier-anchor": {
              const meta = event.data.meta;
              if (lineBounding.saveHitResult(meta.index === -1 ? undefined : meta)) {
                ctx.redraw();
              }
              return;
            }
            default:
              return;
          }
        }
        case "keydown": {
          switch (event.data.key) {
            case "x": {
              const hitResult = lineBoundingHitTest(ctx, ctx.getCursorPoint());
              if (hitResult?.type === "vertex") {
                const patch = deleteVertex(lineShape, hitResult.index);
                if (!isObjectEmpty(patch)) {
                  ctx.patchShapes(getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [lineShape.id]: patch } }));
                }
              }
              return ctx.states.newSelectionHubState;
            }
          }
          return handleIntransientEvent(ctx, event);
        }
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render,
  };
});
