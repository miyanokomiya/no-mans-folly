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
  getLinePath,
  getRelativePointOn,
  patchBodyVertex,
  patchConnection,
} from "../../../../shapes/line";
import { LineBounding, newLineBounding } from "../../../lineBounding";
import { newMovingLineVertexState } from "./movingLineVertexState";
import { newMovingNewVertexState } from "./movingNewVertexState";
import { newDuplicatingShapesState } from "../duplicatingShapesState";
import { createShape } from "../../../../shapes";
import { TextShape, patchPosition } from "../../../../shapes/text";
import { newTextEditingState } from "../text/textEditingState";
import { COMMAND_EXAM_SRC } from "../commandExams";
import { CONTEXT_MENU_ITEM_SRC, getMenuItemsForSelectedShapes } from "../contextMenuItems";
import { getPatchAfterLayouts, getPatchByLayouts } from "../../../shapeLayoutHandler";
import { newMovingLineSegmentState } from "./movingLineSegmentState";
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
import { patchByFliplineH, patchByFliplineV } from "../../../../shapes/utils/line";
import { getSegments } from "../../../../utils/geometry";
import { getDistanceSq } from "okageo";

type VertexMetaForContextMenu = {
  index: number;
};
type SegmentMetaForContextMenu = VertexMetaForContextMenu & { originIndex: 0 | 1 };

export const newLineSelectedState = defineIntransientState(() => {
  let lineShape: LineShape;
  let lineBounding: LineBounding;

  return {
    getLabel: () => "LineSelected",
    onStart: (ctx) => {
      ctx.showFloatMenu();
      lineShape = ctx.getShapeComposite().shapeMap[ctx.getLastSelectedShapeId() ?? ""] as LineShape;
      lineBounding = newLineBounding({ lineShape, styleScheme: ctx.getStyleScheme() });
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
              const hitResult = lineBounding.hitTest(event.data.point, ctx.getScale());
              if (hitResult) {
                if (event.data.options.alt) {
                  return newDuplicatingShapesState;
                }

                switch (hitResult.type) {
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
                    if (event.data.options.shift) {
                      const patch = deleteVertex(lineShape, hitResult.index);
                      if (Object.keys(patch).length > 0) {
                        ctx.patchShapes(
                          getPatchAfterLayouts(ctx.getShapeComposite(), { update: { [lineShape.id]: patch } }),
                        );
                      }
                      return ctx.states.newSelectionHubState;
                    } else {
                      return () => newMovingLineVertexState({ lineShape, index: hitResult.index });
                    }
                  case "segment":
                    return () => newMovingLineSegmentState({ lineShape, index: hitResult.index });
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
              );
            }
            case 1:
              return () => newPointerDownEmptyState(event.data.options);
            case 2: {
              const hitResult = lineBounding.hitTest(event.data.point, ctx.getScale());
              // Prioritize the context menu for a vertex
              if (hitResult?.type === "vertex") return;

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
          const hitResult = lineBounding.hitTest(event.data.current, ctx.getScale());
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
          const hitResult = lineBounding.hitTest(event.data.point, ctx.getScale());
          if (hitResult?.type === "vertex") {
            const connection = getConnection(lineShape, hitResult.index);
            ctx.setContextMenuList({
              items: [
                {
                  ...CONTEXT_MENU_ITEM_SRC.ATTACH_LINE_VERTEX,
                  meta: { index: hitResult.index } as VertexMetaForContextMenu,
                },
                ...(connection
                  ? [
                      {
                        ...CONTEXT_MENU_ITEM_SRC.DETACH_LINE_VERTEX,
                        meta: { index: hitResult.index } as VertexMetaForContextMenu,
                      },
                    ]
                  : []),
                {
                  ...CONTEXT_MENU_ITEM_SRC.DELETE_LINE_VERTEX,
                  meta: { index: hitResult.index } as VertexMetaForContextMenu,
                },
                CONTEXT_MENU_ITEM_SRC.SEPARATOR,
                ...getMenuItemsForSelectedShapes(ctx),
              ],
              point: event.data.point,
            });
            return;
          } else if (hitResult?.type === "segment" || hitResult?.type === "arc-anchor") {
            if (lineShape.lineType !== "elbow") {
              const seg = getSegments(getLinePath(lineShape))[hitResult.index];
              const originIndex =
                getDistanceSq(seg[0], event.data.point) <= getDistanceSq(seg[1], event.data.point) ? 1 : 0;
              ctx.setContextMenuList({
                items: [
                  {
                    ...CONTEXT_MENU_ITEM_SRC.REFINE_SEGMENT,
                    meta: { index: hitResult.index, originIndex } as SegmentMetaForContextMenu,
                  },
                  CONTEXT_MENU_ITEM_SRC.ATTACH_LINE_VERTICES,
                  CONTEXT_MENU_ITEM_SRC.FLIP_LINE_H,
                  CONTEXT_MENU_ITEM_SRC.FLIP_LINE_V,
                  CONTEXT_MENU_ITEM_SRC.SEPARATOR,
                  ...getMenuItemsForSelectedShapes(ctx),
                ],
                point: event.data.point,
              });
              return;
            }
          }

          ctx.setContextMenuList({
            items: [
              CONTEXT_MENU_ITEM_SRC.ATTACH_LINE_VERTICES,
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
        default:
          return handleIntransientEvent(ctx, event);
      }
    },
    render: (ctx, renderCtx) => {
      lineBounding.render(renderCtx, ctx.getScale());
    },
  };
});
