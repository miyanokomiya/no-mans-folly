import { IRectangle, IVec2, applyAffine, getDistance, getRectCenter, isSame, sub } from "okageo";
import { TreeNodeShape, getBoxAlignByDirection, isTreeNodeShape } from "../../shapes/tree/treeNode";
import { TreeRootShape, getTreeChildMargin, getTreeSiblingMargin, isTreeRootShape } from "../../shapes/tree/treeRoot";
import { ShapeComposite } from "../shapeComposite";
import { Direction4, EntityPatchInfo, Shape, StyleScheme } from "../../models";
import { applyFillStyle } from "../../utils/fillStyle";
import { TAU, getDistanceBetweenPointAndRect, getRectRotateFn, getWrapperRect } from "../../utils/geometry";
import { applyStrokeStyle } from "../../utils/strokeStyle";
import { CHILD_MARGIN, SIBLING_MARGIN, TreeLayoutNode, treeLayout } from "../../utils/layouts/tree";
import { flatTree, getAllBranchIds, getTree } from "../../utils/tree";
import { TreeShapeBase, isTreeShapeBase } from "../../shapes/tree/core";
import { generateKeyBetweenAllowSame } from "../../utils/findex";
import { pickMinItem } from "../../utils/commons";
import { defineShapeHandler } from "./core";
import { dropDownTreeLayout } from "../../utils/layouts/dropDownTree";
import { getShapeDetransform, getShapeTransform, getRectShapeCenter, getRectShapeRect } from "../../shapes/rectPolygon";
import { renderOutlinedCircle, scaleGlobalAlpha } from "../../utils/renderer";
import { CanvasCTX } from "../../utils/types";

const ANCHOR_SIZE = 9;
const ANCHOR_MARGIN = 30;
const ANCHOR_SIBLING_MARGIN = 18;
const DROPDOWN_ANCHOR_POSITION_RATE = 0.9;
const MARGIN_ANCHOR_SIZE = 6;

/**
 * - undefined: insert as a child
 * - 0: insert as the previous sibling
 * - 1: insert as the next sibling
 * - -1: disconnect from a parent
 */
type AnchorType = undefined | 0 | 1 | -1 | "sibling-margin" | "child-margin";

export interface TreeHitResult {
  direction: Direction4 | "margin";
  p: IVec2;
  type: AnchorType;
  dropdown?: Direction4;
}

type AnchorInfo = [Direction4 | "margin", IVec2, type?: AnchorType, dropdown?: Direction4];

interface Option {
  getShapeComposite: () => ShapeComposite;
  targetId: string;
}

export const newTreeHandler = defineShapeHandler<TreeHitResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as TreeRootShape | TreeNodeShape;
  const isRoot = isTreeRootShape(shape);
  const directionSrc = isTreeNodeShape(shape) ? shape.direction : 0;
  const dropdownSrc = isTreeNodeShape(shape) ? shape.dropdown : undefined;

  const rootShape = (isRoot ? shape : shapeComposite.shapeMap[(shape as any as TreeNodeShape).parentId ?? ""]) ?? shape;
  const rootTransform = getShapeTransform(rootShape as TreeRootShape);
  const rootDetransform = getShapeDetransform(rootShape as TreeRootShape);

  // Represents local position of the tree.
  const localShapeP = sub(applyAffine(rootDetransform, getRectShapeCenter(shape)), {
    x: shape.width / 2,
    y: shape.height / 2,
  });
  const bounds = { x: localShapeP.x, y: localShapeP.y, width: shape.width, height: shape.height };

  function getAnchors(scale: number): AnchorInfo[] {
    const margin = ANCHOR_MARGIN * scale;
    const siblingMargin = ANCHOR_SIBLING_MARGIN * scale;
    const dropdownMargin = margin * 0.6;

    if (isRoot) {
      const tree = shapeComposite.mergedShapeTreeMap[shape.id];
      const dropdownAnchors: AnchorInfo[] = [
        [1, { x: bounds.x + bounds.width, y: bounds.y + bounds.height + dropdownMargin }, undefined, 2],
        [3, { x: bounds.x, y: bounds.y + bounds.height + dropdownMargin }, undefined, 2],
        [1, { x: bounds.x + bounds.width, y: bounds.y - dropdownMargin }, undefined, 0],
        [3, { x: bounds.x, y: bounds.y - dropdownMargin }, undefined, 0],
      ];

      if (tree.children.length > 0) {
        const node = shapeComposite.mergedShapeMap[tree.children[0].id] as TreeNodeShape;
        const vertical = node.direction === 0 || node.direction === 2;
        return node.dropdown !== undefined
          ? dropdownAnchors
          : vertical
            ? [
                [0, { x: bounds.x + bounds.width / 2, y: bounds.y - margin }],
                [2, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + margin }],
              ]
            : [
                [1, { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height / 2 }],
                [3, { x: bounds.x - margin, y: bounds.y + bounds.height / 2 }],
              ];
      } else {
        return [
          [0, { x: bounds.x + bounds.width / 2, y: bounds.y - margin }],
          [2, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + margin }],
          [1, { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height / 2 }],
          [3, { x: bounds.x - margin, y: bounds.y + bounds.height / 2 }],
          ...dropdownAnchors,
        ];
      }
    }

    if (dropdownSrc === 2) {
      switch (directionSrc) {
        case 3:
          return [
            [3, { x: bounds.x, y: bounds.y + bounds.height + dropdownMargin }, undefined, 2],
            [3, { x: bounds.x + bounds.width / 2, y: bounds.y - siblingMargin }, 0, 2],
            [3, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + siblingMargin }, 1, 2],
            [3, { x: bounds.x + bounds.width + siblingMargin, y: bounds.y + bounds.height * 0.8 }, -1, 2],
          ];
        default:
          return [
            [1, { x: bounds.x + bounds.width, y: bounds.y + bounds.height + dropdownMargin }, undefined, 2],
            [1, { x: bounds.x + bounds.width / 2, y: bounds.y - siblingMargin }, 0, 2],
            [1, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + siblingMargin }, 1, 2],
            [1, { x: bounds.x - siblingMargin, y: bounds.y + bounds.height * 0.8 }, -1, 2],
          ];
      }
    }

    if (dropdownSrc === 0) {
      switch (directionSrc) {
        case 3:
          return [
            [3, { x: bounds.x, y: bounds.y - dropdownMargin }, undefined, 0],
            [3, { x: bounds.x + bounds.width / 2, y: bounds.y - siblingMargin }, 1, 0],
            [3, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + siblingMargin }, 0, 0],
            [3, { x: bounds.x + bounds.width + siblingMargin, y: bounds.y + bounds.height * 0.8 }, -1, 0],
          ];
        default:
          return [
            [1, { x: bounds.x + bounds.width, y: bounds.y - dropdownMargin }, undefined, 0],
            [1, { x: bounds.x + bounds.width / 2, y: bounds.y - siblingMargin }, 1, 0],
            [1, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + siblingMargin }, 0, 0],
            [1, { x: bounds.x - siblingMargin, y: bounds.y + bounds.height * 0.8 }, -1, 0],
          ];
      }
    }

    switch (directionSrc) {
      case 0:
        return [
          [0, { x: bounds.x + bounds.width / 2, y: bounds.y - margin }],
          [0, { x: bounds.x - siblingMargin, y: bounds.y + bounds.height / 2 }, 0],
          [0, { x: bounds.x + bounds.width + siblingMargin, y: bounds.y + bounds.height / 2 }, 1],
          [0, { x: bounds.x + bounds.width * 0.8, y: bounds.y + bounds.height + siblingMargin }, -1],
        ];
      case 2:
        return [
          [2, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + margin }],
          [2, { x: bounds.x - siblingMargin, y: bounds.y + bounds.height / 2 }, 0],
          [2, { x: bounds.x + bounds.width + siblingMargin, y: bounds.y + bounds.height / 2 }, 1],
          [2, { x: bounds.x + bounds.width * 0.8, y: bounds.y - siblingMargin }, -1],
        ];
      case 3:
        return [
          [3, { x: bounds.x - margin, y: bounds.y + bounds.height / 2 }],
          [3, { x: bounds.x + bounds.width / 2, y: bounds.y - siblingMargin }, 0],
          [3, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + siblingMargin }, 1],
          [3, { x: bounds.x + bounds.width + siblingMargin, y: bounds.y + bounds.height * 0.8 }, -1],
        ];
      default:
        return [
          [1, { x: bounds.x + bounds.width + margin, y: bounds.y + bounds.height / 2 }],
          [1, { x: bounds.x + bounds.width / 2, y: bounds.y - siblingMargin }, 0],
          [1, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height + siblingMargin }, 1],
          [1, { x: bounds.x - siblingMargin, y: bounds.y + bounds.height * 0.8 }, -1],
        ];
    }
  }

  function getMarginAnchors(scale: number): AnchorInfo[] | undefined {
    if (!isRoot) return;

    const anchors = getLocalMarginAnchorPoints(shape, scale);
    return [
      ["margin", anchors[0], "sibling-margin"],
      ["margin", anchors[1], "child-margin"],
    ];
  }

  function hitTest(p: IVec2, scale = 1): TreeHitResult | undefined {
    const threshold = ANCHOR_SIZE * scale;
    const thresholdForMargin = MARGIN_ANCHOR_SIZE * scale;
    const localP = applyAffine(rootDetransform, p);

    const marginAnchor = getMarginAnchors(scale)?.find((a) => getDistance(a[1], localP) <= thresholdForMargin);
    if (marginAnchor) {
      return { direction: marginAnchor[0], p: marginAnchor[1], type: marginAnchor[2], dropdown: marginAnchor[3] };
    }

    const anchor = getAnchors(scale).find((a) => getDistance(a[1], localP) <= threshold);
    if (anchor) {
      return { direction: anchor[0], p: anchor[1], type: anchor[2], dropdown: anchor[3] };
    }
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, hitResult?: TreeHitResult) {
    const anchors = getAnchors(scale);
    const threshold = ANCHOR_SIZE * scale;
    const thresholdForMargin = MARGIN_ANCHOR_SIZE * scale;

    ctx.save();
    ctx.transform(...rootTransform);

    applyFillStyle(ctx, { color: style.selectionPrimary });
    applyStrokeStyle(ctx, { color: style.selectionPrimary, width: 2 * scale });
    ctx.beginPath();
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    anchors
      .filter(([, , t]) => t !== -1)
      .forEach(([d, p, t, dropdown]) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);

        if (dropdown !== undefined) {
          switch (d) {
            case 3:
              if (t === 0) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y + (dropdown === 0 ? bounds.height : 0));
              } else if (t === 1) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y + (dropdown === 0 ? 0 : bounds.height));
              } else {
                ctx.lineTo(
                  bounds.x + bounds.width * (1 - DROPDOWN_ANCHOR_POSITION_RATE),
                  bounds.y + (dropdown === 2 ? bounds.height : 0),
                );
              }
              break;
            default:
              if (t === 0) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y + (dropdown === 0 ? bounds.height : 0));
              } else if (t === 1) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y + (dropdown === 0 ? 0 : bounds.height));
              } else {
                ctx.lineTo(
                  bounds.x + bounds.width * DROPDOWN_ANCHOR_POSITION_RATE,
                  bounds.y + (dropdown === 2 ? bounds.height : 0),
                );
              }
              break;
          }
        } else {
          switch (d) {
            case 0:
              if (t === 0) {
                ctx.lineTo(bounds.x, bounds.y + bounds.height / 2);
              } else if (t === 1) {
                ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height / 2);
              } else {
                ctx.lineTo(p.x, bounds.y);
              }
              break;
            case 2:
              if (t === 0) {
                ctx.lineTo(bounds.x, bounds.y + bounds.height / 2);
              } else if (t === 1) {
                ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height / 2);
              } else {
                ctx.lineTo(p.x, bounds.y + bounds.height);
              }
              break;
            case 3:
              if (t === 0) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y);
              } else if (t === 1) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y + bounds.height);
              } else {
                ctx.lineTo(bounds.x, p.y);
              }
              break;
            default:
              if (t === 0) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y);
              } else if (t === 1) {
                ctx.lineTo(bounds.x + bounds.width / 2, bounds.y + bounds.height);
              } else {
                ctx.lineTo(bounds.x + bounds.width, p.y);
              }
              break;
          }
        }

        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, threshold, 0, TAU);
        ctx.fill();
      });

    applyFillStyle(ctx, { color: style.alert });
    applyStrokeStyle(ctx, { color: style.alert, width: scale });
    anchors
      .filter(([, , t]) => t === -1)
      .forEach(([d, p]) => {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        switch (d) {
          case 0:
            ctx.lineTo(p.x, bounds.y + bounds.height);
            break;
          case 2:
            ctx.lineTo(p.x, bounds.y);
            break;
          case 3:
            ctx.lineTo(bounds.x + bounds.width, p.y);
            break;
          default:
            ctx.lineTo(bounds.x, p.y);
            break;
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, threshold * 0.7, 0, TAU);
        ctx.fill();
      });

    const marginAnchors = getMarginAnchors(scale);
    marginAnchors?.forEach(([, p]) => {
      renderOutlinedCircle(ctx, p, thresholdForMargin, style.transformAnchor);
    });

    if (hitResult) {
      switch (hitResult.type) {
        case "sibling-margin":
        case "child-margin":
          renderOutlinedCircle(ctx, hitResult.p, thresholdForMargin, style.selectionSecondaly);
          break;
        default:
          renderOutlinedCircle(ctx, hitResult.p, threshold, style.selectionSecondaly);
          break;
      }
    }

    ctx.restore();
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      if (a && b) {
        return a?.direction === b?.direction && isSame(a.p, b.p);
      }
      return !a && !b;
    },
  };
});

export function getLocalMarginAnchorPoints(shape: TreeRootShape, scale: number): [sibling: IVec2, child: IVec2] {
  const margin = ANCHOR_MARGIN * scale * 0.4;
  return [
    { x: -margin, y: shape.siblingMargin ?? SIBLING_MARGIN },
    { x: getTreeChildMargin(shape), y: -margin },
  ];
}

export interface TreeNodeMovingResult {
  treeParentId: string;
  direction: Direction4;
  dropdown?: Direction4;
  findex: string;
}

/**
 * Suppose a tree can contain either vertical or horizontal branches.
 */
export const newTreeNodeMovingHandler = defineShapeHandler<TreeNodeMovingResult, Option>((option) => {
  const shapeComposite = option.getShapeComposite();
  const shape = shapeComposite.shapeMap[option.targetId] as TreeNodeShape;
  const root = shapeComposite.shapeMap[shape.parentId!] as TreeRootShape;
  const vertical = shape.direction === 0 || shape.direction === 2;
  const isDropdown = shape.dropdown !== undefined;

  const tree = shapeComposite.mergedShapeTreeMap[root.id];
  const allIds = flatTree([shapeComposite.mergedShapeTreeMap[root.id]]).map((t) => t.id);
  const allShapeNodes = tree.children.map((t) => shapeComposite.shapeMap[t.id] as TreeNodeShape);

  const ownBranchIdSet = new Set(getTreeBranchIds(shapeComposite, [shape.id]));
  const candidateIds = allIds.filter((id) => !ownBranchIdSet.has(id));

  const rootTransform = getShapeTransform(root as TreeRootShape);
  const rootDetransform = getShapeDetransform(root as TreeRootShape);
  const rootC = getRectShapeCenter(root);
  const rectRotateFn = getRectRotateFn(root.rotation, rootC);

  const rects = candidateIds.map<[string, IRectangle]>((id) => {
    const rect = rectRotateFn(getRectShapeRect(shapeComposite.shapeMap[id] as TreeShapeBase), true);
    return [id, { x: rect.x - root.p.x, y: rect.y - root.p.y, width: rect.width, height: rect.height }];
  });

  function hitTest(globalP: IVec2): TreeNodeMovingResult | undefined {
    if (rects.length === 0) return;

    const p = applyAffine(rootDetransform, globalP);
    const evaluated = rects.map<[string, IRectangle, number]>(([id, rect]) => [
      id,
      rect,
      getDistanceBetweenPointAndRect(p, rect),
    ]);
    const [closestId, closestRect] = pickMinItem(evaluated, (v) => v[2])!;
    if (option.targetId === closestId) return;

    const closest = shapeComposite.shapeMap[closestId] as TreeShapeBase;
    const closestRectCenter = getRectCenter(closestRect);

    if (isTreeRootShape(closest)) {
      const closestNode = closest as TreeRootShape;

      const direction = vertical
        ? closestRect.y + closestRect.height / 2 < p.y
          ? 2
          : 0
        : closestRect.x + closestRect.width / 2 < p.x
          ? 1
          : 3;
      const dropdown = isDropdown ? (closestRect.y + closestRect.height / 2 < p.y ? 2 : 0) : undefined;
      const siblings = allShapeNodes.filter(
        (s) => s.treeParentId === closestNode.id && s.direction === direction && s.dropdown === dropdown,
      );
      if (siblings.length > 0) {
        if (isDropdown) {
          // Case: Insert as the first child
          const next = siblings[0];
          if (next.id === shape.id) return;

          return {
            treeParentId: closestNode.id,
            direction,
            dropdown: next.dropdown,
            findex: generateKeyBetweenAllowSame(null, next.findex),
          };
        }

        // Case: Insert as the last child
        const prev = siblings[siblings.length - 1];
        if (prev.id === shape.id) return;

        return {
          treeParentId: closestNode.id,
          direction,
          dropdown: prev.dropdown,
          findex: generateKeyBetweenAllowSame(prev.findex, null),
        };
      } else {
        // Case: Insert as a child & The parent has no children
        return {
          treeParentId: closestNode.id,
          direction,
          dropdown,
          findex: generateKeyBetweenAllowSame(closestNode.findex, null),
        };
      }
    } else {
      const closestNode = closest as TreeNodeShape;
      const siblings = allShapeNodes.filter(
        (s) =>
          s.treeParentId === closestNode.treeParentId &&
          s.direction === closestNode.direction &&
          s.dropdown === closestNode.dropdown,
      );

      if (closestNode.direction === 2 || closestNode.direction === 0) {
        if (closestNode.direction === 2) {
          if (closestRect.y + closestRect.height < p.y) {
            const childrenOfClosest = allShapeNodes.filter((s) => s.treeParentId === closestNode.id);
            if (childrenOfClosest.length === 0) {
              // Case: Insert as a child & The parent has no children
              return {
                treeParentId: closestNode.id,
                direction: closestNode.direction,
                dropdown: closestNode.dropdown,
                findex: generateKeyBetweenAllowSame(closestNode.findex, null),
              };
            }
          }
        } else {
          if (p.y < closestRect.y) {
            const childrenOfClosest = allShapeNodes.filter((s) => s.treeParentId === closestNode.id);
            if (childrenOfClosest.length === 0) {
              // Case: Insert as a child & The parent has no children
              return {
                treeParentId: closestNode.id,
                direction: closestNode.direction,
                dropdown: closestNode.dropdown,
                findex: generateKeyBetweenAllowSame(closestNode.findex, null),
              };
            }
          }
        }

        return getTreeNodeMovingResultToInsertSibling(
          shapeComposite,
          shape.id,
          closestNode,
          siblings,
          p.x < closestRectCenter.x,
        );
      } else {
        if (closestNode.direction === 1) {
          if (closestRect.x + closestRect.width < p.x) {
            const childrenOfClosest = allShapeNodes.filter((s) => s.treeParentId === closestNode.id);
            if (childrenOfClosest.length === 0) {
              // Case: Insert as a child & The parent has no children
              return {
                treeParentId: closestNode.id,
                direction: closestNode.direction,
                dropdown: closestNode.dropdown,
                findex: generateKeyBetweenAllowSame(closestNode.findex, null),
              };
            }
          }
        } else {
          if (p.x < closestRect.x) {
            const childrenOfClosest = allShapeNodes.filter((s) => s.treeParentId === closestNode.id);
            if (childrenOfClosest.length === 0) {
              // Case: Insert as a child & The parent has no children
              return {
                treeParentId: closestNode.id,
                direction: closestNode.direction,
                dropdown: closestNode.dropdown,
                findex: generateKeyBetweenAllowSame(closestNode.findex, null),
              };
            }
          }
        }

        return getTreeNodeMovingResultToInsertSibling(
          shapeComposite,
          shape.id,
          closestNode,
          siblings,
          closestNode.dropdown === 0 ? p.y > closestRectCenter.y : p.y < closestRectCenter.y,
        );
      }
    }
  }

  function render(ctx: CanvasCTX, style: StyleScheme, scale: number, movingResult?: TreeNodeMovingResult) {
    ctx.save();
    ctx.transform(...rootTransform);
    ctx.translate(-root.p.x, -root.p.y);

    // Render the bounds of moving branch.
    {
      const branchRects = Array.from(ownBranchIdSet).map((id) =>
        rectRotateFn(getRectShapeRect(shapeComposite.mergedShapeMap[id] as TreeShapeBase), true),
      );
      const rect = getWrapperRect(branchRects);
      applyFillStyle(ctx, { color: style.selectionSecondaly });
      applyStrokeStyle(ctx, { color: style.selectionSecondaly, width: scale * 2 });
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      scaleGlobalAlpha(ctx, 0.3, () => {
        ctx.fill();
      });
      ctx.stroke();
    }

    // Render the preview of insertion.
    if (movingResult) {
      applyFillStyle(ctx, { color: style.selectionPrimary });
      applyStrokeStyle(ctx, { color: style.selectionPrimary, width: scale * 2 });

      const treeParent = shapeComposite.shapeMap[movingResult.treeParentId] as TreeShapeBase;
      const treeParentRect = rectRotateFn(getRectShapeRect(treeParent), true);
      const siblings = allShapeNodes.filter(
        (s) =>
          s.treeParentId === treeParent.id &&
          s.direction === movingResult.direction &&
          s.dropdown === movingResult.dropdown,
      );
      const _nextIndex = siblings.findIndex((s) => movingResult.findex < s.findex);
      const nextIndex = _nextIndex === -1 ? siblings.length : _nextIndex;

      renderMovingPreview(
        ctx,
        movingResult.direction,
        movingResult.dropdown,
        treeParentRect,
        nextIndex > 0 ? rectRotateFn(getRectShapeRect(siblings[nextIndex - 1]), true) : undefined,
        nextIndex < siblings.length ? rectRotateFn(getRectShapeRect(siblings[nextIndex]), true) : undefined,
      );
    }

    ctx.restore();
  }

  return {
    hitTest,
    render,
    isSameHitResult: (a, b) => {
      return a?.treeParentId === b?.treeParentId && a?.direction === b?.direction && a?.findex === b?.findex;
    },
  };
});

function getTreeNodeMovingResultToInsertSibling(
  shapeComposite: ShapeComposite,
  targetId: string,
  closestNode: TreeNodeShape,
  closestNodeSiblings: TreeNodeShape[],
  previous = false,
): TreeNodeMovingResult | undefined {
  const index = closestNodeSiblings.findIndex((c) => c.id === closestNode.id);
  if (previous) {
    if (index > 0) {
      // Case: Insert as an intermediate child
      const prev = shapeComposite.shapeMap[closestNodeSiblings[index - 1].id];
      if (prev.id === targetId) return;

      return {
        treeParentId: closestNode.treeParentId,
        direction: closestNode.direction,
        dropdown: closestNode.dropdown,
        findex: generateKeyBetweenAllowSame(prev.findex, closestNode.findex),
      };
    } else {
      // Case: Insert as the first child
      return {
        treeParentId: closestNode.treeParentId,
        direction: closestNode.direction,
        dropdown: closestNode.dropdown,
        findex: generateKeyBetweenAllowSame(null, closestNode.findex),
      };
    }
  } else {
    if (index < closestNodeSiblings.length - 1) {
      // Case: Insert as an intermediate child
      const next = shapeComposite.shapeMap[closestNodeSiblings[index + 1].id];
      if (next.id === targetId) return;

      return {
        treeParentId: closestNode.treeParentId,
        direction: closestNode.direction,
        dropdown: closestNode.dropdown,
        findex: generateKeyBetweenAllowSame(closestNode.findex, next.findex),
      };
    } else {
      // Case: Insert as the last child
      return {
        treeParentId: closestNode.treeParentId,
        direction: closestNode.direction,
        dropdown: closestNode.dropdown,
        findex: generateKeyBetweenAllowSame(closestNode.findex, null),
      };
    }
  }
}

export function isSameTreeNodeMovingResult(a?: TreeNodeMovingResult, b?: TreeNodeMovingResult): boolean {
  if (a && b) {
    return a.direction === b.direction && a.treeParentId === b.treeParentId && a.findex === b.findex;
  }

  return !a && !b;
}

function toLayoutNode(shape: TreeShapeBase): TreeLayoutNode {
  const rect = getRectShapeRect(shape);
  if (isTreeNodeShape(shape)) {
    return {
      id: shape.id,
      findex: shape.findex,
      type: "node",
      rect,
      direction: shape.direction,
      dropdown: shape.dropdown,
      parentId: shape.treeParentId,
    };
  } else {
    const root = shape as TreeRootShape;
    return {
      id: root.id,
      findex: root.findex,
      type: "root",
      rect,
      direction: 0,
      parentId: "",
      siblingMargin: getTreeSiblingMargin(root),
      childMargin: getTreeChildMargin(root),
    };
  }
}

function toLayoutNodes(shapeComposite: ShapeComposite, rootId: string): TreeLayoutNode[] {
  const tree = shapeComposite.mergedShapeTreeMap[rootId];
  const layoutNodes: TreeLayoutNode[] = [];
  flatTree([tree]).forEach((t) => {
    const s = shapeComposite.mergedShapeMap[t.id];
    if (!isTreeShapeBase(s)) return;
    const node = toLayoutNode(s);
    if (!node.parentId || shapeComposite.mergedShapeMap[node.parentId]) {
      layoutNodes.push(node);
    } else {
      // Fallback when a parent doesn't exist for whatever reason.
      layoutNodes.push({ ...node, parentId: rootId });
    }
  });
  return layoutNodes;
}

/**
 * Returns shape ids that belong to the the branches of the targets. The targets included.
 */
export function getTreeBranchIds(shapeComposite: ShapeComposite, targetIds: string[]): string[] {
  if (targetIds.length === 0) return [];

  const indexShape = shapeComposite.mergedShapeMap[targetIds[0]];
  const layoutNodes = toLayoutNodes(shapeComposite, indexShape.parentId || indexShape.id);
  return getAllBranchIds(flatTree(getTree(layoutNodes)), targetIds);
}

export function generateFindexPreviousAt(shapeComposite: ShapeComposite, targetId: string): string {
  const shape = shapeComposite.shapeMap[targetId] as TreeNodeShape;
  const tree = shapeComposite.mergedShapeTreeMap[shape.parentId!];
  const allShapeNodes = tree.children.map((t) => shapeComposite.shapeMap[t.id] as TreeNodeShape);
  const siblings = allShapeNodes.filter(
    (s) => s.treeParentId === shape.treeParentId && s.direction === shape.direction,
  );
  const targetIndex = siblings.findIndex((s) => s.id === shape.id);
  return targetIndex === 0
    ? generateKeyBetweenAllowSame(null, shape.findex)
    : generateKeyBetweenAllowSame(siblings[targetIndex - 1].findex, shape.findex);
}

export function generateFindexNextAt(shapeComposite: ShapeComposite, targetId: string): string {
  const shape = shapeComposite.shapeMap[targetId] as TreeNodeShape;
  const tree = shapeComposite.mergedShapeTreeMap[shape.parentId!];
  const allShapeNodes = tree.children.map((t) => shapeComposite.shapeMap[t.id] as TreeNodeShape);
  const siblings = allShapeNodes.filter(
    (s) => s.treeParentId === shape.treeParentId && s.direction === shape.direction,
  );
  const targetIndex = siblings.findIndex((s) => s.id === shape.id);
  return targetIndex === siblings.length - 1
    ? generateKeyBetweenAllowSame(shape.findex, null)
    : generateKeyBetweenAllowSame(shape.findex, siblings[targetIndex + 1].findex);
}

export function getNextTreeLayout(shapeComposite: ShapeComposite, rootId: string): { [id: string]: Partial<Shape> } {
  const root = shapeComposite.mergedShapeTreeMap[rootId];
  if (root.children.length === 0) return {};

  const rootShape = shapeComposite.mergedShapeMap[root.id] as TreeRootShape;
  const rootC = getRectShapeCenter(rootShape);
  const rectRotateFn = getRectRotateFn(rootShape.rotation, rootC);

  const node = shapeComposite.mergedShapeMap[root.children[0].id] as TreeNodeShape;
  const isDropdown = node.dropdown === 0 || node.dropdown === 2;

  const layoutNodes = toLayoutNodes(shapeComposite, rootId);
  const result = isDropdown ? dropDownTreeLayout(layoutNodes) : treeLayout(layoutNodes);

  const ret: { [id: string]: Partial<Shape> } = {};
  result.forEach((r) => {
    const s = shapeComposite.shapeMap[r.id] as TreeNodeShape;
    const rotatedRect = rectRotateFn(r.rect);
    const p = { x: rotatedRect.x, y: rotatedRect.y };

    if (!isSame(p, s.p)) {
      ret[r.id] = { p: { x: p.x, y: p.y } };
    }
    if (s.rotation !== rootShape.rotation) {
      if (ret[r.id]) {
        ret[r.id].rotation = rootShape.rotation;
      } else {
        ret[r.id] = { rotation: rootShape.rotation };
      }
    }
  });

  return ret;
}

export function getTreeLayoutPatchFunctions(
  srcComposite: ShapeComposite,
  updatedComposite: ShapeComposite,
  patchInfo: EntityPatchInfo<Shape>,
) {
  return getModifiedTreeRootIds(srcComposite, patchInfo).map((id) => {
    return () => getNextTreeLayout(updatedComposite, id);
  });
}

export function getModifiedTreeRootIds(srcComposite: ShapeComposite, patchInfo: EntityPatchInfo<Shape>) {
  const targetTreeRootIdSet = new Set<string>();
  const deletedRootIdSet = new Set<string>();

  if (patchInfo.add) {
    patchInfo.add.forEach((shape) => {
      if (isTreeRootShape(shape)) {
        targetTreeRootIdSet.add(shape.id);
      } else if (isTreeNodeShape(shape) && isValidTreeNode(srcComposite, shape)) {
        targetTreeRootIdSet.add(shape.parentId!);
      }
    });
  }

  if (patchInfo.update) {
    Object.keys(patchInfo.update).forEach((id) => {
      const shape = srcComposite.shapeMap[id];
      if (!shape) return;

      if (isTreeRootShape(shape)) {
        targetTreeRootIdSet.add(shape.id);
      } else if (isTreeNodeShape(shape) && isValidTreeNode(srcComposite, shape)) {
        targetTreeRootIdSet.add(shape.parentId!);
      }
    });
  }

  if (patchInfo.delete) {
    patchInfo.delete.forEach((id) => {
      const shape = srcComposite.shapeMap[id];
      if (!shape) return;

      if (isTreeRootShape(shape)) {
        deletedRootIdSet.add(shape.id);
      } else if (isTreeNodeShape(shape) && isValidTreeNode(srcComposite, shape)) {
        targetTreeRootIdSet.add(shape.parentId!);
      }
    });
  }

  return Array.from(targetTreeRootIdSet).filter((id) => !deletedRootIdSet.has(id));
}

/**
 * Returns patch data to disconnect the target branch and make it new tree root.
 * This function doesn't recalculate tree layout for either original and new trees.
 */
export function getPatchToDisconnectBranch(
  shapeComposite: ShapeComposite,
  targetNodeId: string,
): { [id: string]: Partial<Shape> } {
  const branchIds = getTreeBranchIds(shapeComposite, [targetNodeId]);
  return {
    ...branchIds.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
      p[id] = { parentId: targetNodeId };
      return p;
    }, {}),
    [targetNodeId]: getPatchToConvertNodeToRoot(),
  };
}

function getPatchToConvertNodeToRoot(): Partial<TreeNodeShape> {
  return {
    type: "tree_root",
    parentId: undefined,
    treeParentId: undefined,
    direction: undefined,
    vAlign: undefined,
    hAlign: undefined,
  };
}

/**
 * Returns patch data to graft the target branch to other tree.
 * This function doesn't recalculate tree layout.
 */
export function getPatchToGraftBranch(
  shapeComposite: ShapeComposite,
  branchRootId: string,
  graftTargetId: string,
): { [id: string]: Partial<Shape> } {
  const branchIds = getTreeBranchIds(shapeComposite, [branchRootId]);
  const graftTarget = shapeComposite.mergedShapeMap[graftTargetId] as TreeShapeBase;
  const branchPatch = getPatchToConvertRootToNode(graftTarget);

  // Generate new findex when a sibling exists at the branch's new position.
  const allShapeNodes = shapeComposite.getAllBranchMergedShapes([branchPatch.parentId!]);
  const graftSiblings = allShapeNodes.filter(
    (s) => isTreeNodeShape(s) && s.treeParentId === branchPatch.treeParentId && s.direction === branchPatch.direction,
  );
  const graftElderId = graftSiblings.length > 0 ? graftSiblings[graftSiblings.length - 1].id : undefined;
  const graftElder = graftElderId ? (shapeComposite.mergedShapeMap[graftElderId] as TreeNodeShape) : undefined;
  const branchFIndex = graftElder ? generateKeyBetweenAllowSame(graftElder.findex, null) : undefined;

  const dropdown = graftElder?.dropdown ?? branchPatch.dropdown;

  return {
    ...branchIds.reduce<{ [id: string]: Partial<TreeNodeShape> }>((p, id) => {
      p[id] = {
        parentId: branchPatch.parentId,
        direction: branchPatch.direction,
        dropdown,
        vAlign: branchPatch.vAlign,
        hAlign: branchPatch.hAlign,
      };
      return p;
    }, {}),
    [branchRootId]: branchFIndex
      ? {
          ...branchPatch,
          dropdown,
          findex: branchFIndex,
        }
      : branchPatch,
  };
}

function getPatchToConvertRootToNode(graftTargetShape: TreeShapeBase): Partial<TreeNodeShape> {
  if (isTreeNodeShape(graftTargetShape)) {
    return {
      type: "tree_node",
      parentId: graftTargetShape.parentId,
      treeParentId: graftTargetShape.id,
      direction: graftTargetShape.direction,
      dropdown: graftTargetShape.dropdown,
      vAlign: graftTargetShape.vAlign,
      hAlign: graftTargetShape.hAlign,
    };
  } else {
    return {
      type: "tree_node",
      parentId: graftTargetShape.id,
      treeParentId: graftTargetShape.id,
      direction: 1,
      dropdown: undefined,
      ...getBoxAlignByDirection(1),
    };
  }
}

function renderMovingPreview(
  ctx: CanvasCTX,
  direction: Direction4,
  dropdown: Direction4 | undefined,
  parentRect: IRectangle,
  prevRect?: IRectangle,
  nextRect?: IRectangle,
) {
  const siblingMargin = SIBLING_MARGIN;
  const childMargin = CHILD_MARGIN;
  const anchorWidth = 50;
  const anchorHeight = 16;

  if (dropdown !== undefined) {
    switch (direction) {
      case 3: {
        const x = parentRect.x + parentRect.width / 2 - childMargin - anchorWidth;
        let to: IVec2;
        if (prevRect && nextRect) {
          // Case: Insert as an intermediate child
          to = { x, y: (prevRect.y + prevRect.height + nextRect.y) / 2 };
        } else if (prevRect) {
          // Case: Insert as the last child
          to =
            dropdown === 0
              ? { x, y: prevRect.y - siblingMargin / 2 }
              : { x, y: prevRect.y + prevRect.height + siblingMargin / 2 };
        } else if (nextRect) {
          // Case: Insert as the first child
          to =
            dropdown === 0
              ? { x, y: nextRect.y + nextRect.height + siblingMargin / 2 }
              : { x, y: nextRect.y - siblingMargin / 2 };
        } else {
          // Case: Insert as a child & The parent has no children
          to =
            dropdown === 0
              ? {
                  x,
                  y: parentRect.y - siblingMargin / 2,
                }
              : { x, y: parentRect.y + parentRect.height + siblingMargin / 2 };
        }

        ctx.beginPath();
        const px = parentRect.x + parentRect.width / 2;
        ctx.moveTo(px, parentRect.y + (dropdown === 0 ? 0 : parentRect.height));
        ctx.lineTo(px, to.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(to.x, to.y - anchorHeight / 2, anchorWidth, anchorHeight);
        ctx.fill();
        return;
      }
      default: {
        let to: IVec2;
        if (prevRect && nextRect) {
          // Case: Insert as an intermediate child
          to = { x: nextRect.x, y: (prevRect.y + prevRect.height + nextRect.y) / 2 };
        } else if (prevRect) {
          // Case: Insert as the last child
          to =
            dropdown === 0
              ? { x: prevRect.x, y: prevRect.y - siblingMargin / 2 }
              : { x: prevRect.x, y: prevRect.y + prevRect.height + siblingMargin / 2 };
        } else if (nextRect) {
          // Case: Insert as the first child
          to =
            dropdown === 0
              ? { x: nextRect.x, y: nextRect.y + nextRect.height + siblingMargin / 2 }
              : { x: nextRect.x, y: nextRect.y - siblingMargin / 2 };
        } else {
          // Case: Insert as a child & The parent has no children
          to =
            dropdown === 0
              ? {
                  x: parentRect.x + parentRect.width / 2 + childMargin,
                  y: parentRect.y - siblingMargin / 2,
                }
              : {
                  x: parentRect.x + parentRect.width / 2 + childMargin,
                  y: parentRect.y + parentRect.height + siblingMargin / 2,
                };
        }

        ctx.beginPath();
        const px = parentRect.x + parentRect.width / 2;
        ctx.moveTo(px, parentRect.y + (dropdown === 0 ? 0 : parentRect.height));
        ctx.lineTo(px, to.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(to.x, to.y - anchorHeight / 2, anchorWidth, anchorHeight);
        ctx.fill();
        return;
      }
    }
  }

  switch (direction) {
    case 0: {
      const y = parentRect.y - childMargin;
      let to: IVec2;
      if (prevRect && nextRect) {
        // Case: Insert as an intermediate child
        to = { x: (prevRect.x + prevRect.width + nextRect.x) / 2, y };
      } else if (prevRect) {
        // Case: Insert as the last child
        to = { x: prevRect.x + prevRect.width + siblingMargin / 2, y };
      } else if (nextRect) {
        // Case: Insert as the first child
        to = { x: nextRect.x - siblingMargin / 2, y };
      } else {
        // Case: Insert as a child & The parent has no children
        to = { x: parentRect.x + parentRect.width / 2, y };
      }

      ctx.beginPath();
      ctx.moveTo(parentRect.x + parentRect.width / 2, parentRect.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(to.x - anchorHeight / 2, to.y - anchorWidth, anchorHeight, anchorWidth);
      ctx.fill();
      return;
    }
    case 2: {
      let to: IVec2;
      if (prevRect && nextRect) {
        // Case: Insert as an intermediate child
        to = { x: (prevRect.x + prevRect.width + nextRect.x) / 2, y: nextRect.y };
      } else if (prevRect) {
        // Case: Insert as the last child
        to = { x: prevRect.x + prevRect.width + siblingMargin / 2, y: prevRect.y };
      } else if (nextRect) {
        // Case: Insert as the first child
        to = { x: nextRect.x - siblingMargin / 2, y: nextRect.y };
      } else {
        // Case: Insert as a child & The parent has no children
        to = { x: parentRect.x + parentRect.width / 2, y: parentRect.y + parentRect.height + childMargin };
      }

      ctx.beginPath();
      ctx.moveTo(parentRect.x + parentRect.width / 2, parentRect.y + parentRect.height);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(to.x - anchorHeight / 2, to.y, anchorHeight, anchorWidth);
      ctx.fill();
      return;
    }
    case 3: {
      const x = parentRect.x - childMargin;
      let to: IVec2;
      if (prevRect && nextRect) {
        // Case: Insert as an intermediate child
        to = { x, y: (prevRect.y + prevRect.height + nextRect.y) / 2 };
      } else if (prevRect) {
        // Case: Insert as the last child
        to = { x, y: prevRect.y + prevRect.height + siblingMargin / 2 };
      } else if (nextRect) {
        // Case: Insert as the first child
        to = { x, y: nextRect.y - siblingMargin / 2 };
      } else {
        // Case: Insert as a child & The parent has no children
        to = { x, y: parentRect.y + parentRect.height / 2 };
      }

      ctx.beginPath();
      ctx.moveTo(parentRect.x, parentRect.y + parentRect.height / 2);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(to.x - anchorWidth, to.y - anchorHeight / 2, anchorWidth, anchorHeight);
      ctx.fill();
      return;
    }
    default: {
      let to: IVec2;
      if (prevRect && nextRect) {
        // Case: Insert as an intermediate child
        to = { x: nextRect.x, y: (prevRect.y + prevRect.height + nextRect.y) / 2 };
      } else if (prevRect) {
        // Case: Insert as the last child
        to = { x: prevRect.x, y: prevRect.y + prevRect.height + siblingMargin / 2 };
      } else if (nextRect) {
        // Case: Insert as the first child
        to = { x: nextRect.x, y: nextRect.y - siblingMargin / 2 };
      } else {
        // Case: Insert as a child & The parent has no children
        to = { x: parentRect.x + parentRect.width + childMargin, y: parentRect.y + parentRect.height / 2 };
      }

      ctx.beginPath();
      ctx.moveTo(parentRect.x + parentRect.width, parentRect.y + parentRect.height / 2);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(to.x, to.y - anchorHeight / 2, anchorWidth, anchorHeight);
      ctx.fill();
      return;
    }
  }
}

function hasValidTreeRoot(shapeComposite: ShapeComposite, shape: TreeNodeShape): boolean {
  return !!shape.parentId && isTreeRootShape(shapeComposite.shapeMap[shape.parentId]);
}

function hasValidTreeParent(shapeComposite: ShapeComposite, shape: TreeNodeShape): boolean {
  return !!shape.treeParentId && !!shapeComposite.shapeMap[shape.treeParentId];
}

export function isValidTreeNode(shapeComposite: ShapeComposite, shape: TreeNodeShape): boolean {
  return hasValidTreeRoot(shapeComposite, shape) && hasValidTreeParent(shapeComposite, shape);
}

export function canBeGraftTarget(shapeComposite: ShapeComposite, shape: Shape): shape is TreeShapeBase {
  return isTreeRootShape(shape) || (isTreeNodeShape(shape) && isValidTreeNode(shapeComposite, shape));
}
