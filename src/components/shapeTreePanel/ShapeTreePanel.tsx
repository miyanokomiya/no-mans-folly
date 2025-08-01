import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ShapeComposite, swapShapeParent } from "../../composables/shapeComposite";
import {
  useDocumentMapWithoutTmpInfo,
  useSelectedSheet,
  useShapeLastSelectedId,
  useShapeSelectedMap,
  useStaticShapeComposite,
} from "../../hooks/storeHooks";
import { TreeNode } from "../../utils/tree";
import { AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import { ShapeSelectionScope, isSameShapeSelectionScope } from "../../shapes/core";
import { useGlobalDrag } from "../../hooks/window";
import { IVec2 } from "okageo";
import { isGroupShape } from "../../shapes/group";
import { isAlignBoxShape } from "../../shapes/align/alignBox";
import { isCtrlOrMeta } from "../../utils/devices";
import { ToggleInput } from "../atoms/inputs/ToggleInput";
import { selectShapesInRange } from "../../composables/states/appCanvas/commons";
import { rednerRGBA } from "../../utils/color";
import { getLabel, hasSpecialOrderPriority } from "../../shapes";
import { newShapeRenderer, ShapeRenderer } from "../../composables/shapeRenderer";
import { ClickOrDragHandler } from "../atoms/ClickOrDragHandler";

type DropOperation = "group" | "above" | "below";

export const ShapeTreePanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const sheet = useSelectedSheet();
  const sheetColor = sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff";
  const rootRef = useRef<HTMLDivElement>(null);

  const shapeComposite = useStaticShapeComposite();
  const documentMap = useDocumentMapWithoutTmpInfo();
  const imageStore = getCtx().getImageStore();
  const selectedIdMap = useShapeSelectedMap();
  const selectedLastId = useShapeLastSelectedId();
  const selectionScope = useMemo(() => {
    if (!selectedLastId) return;
    const s = shapeComposite.shapeMap[selectedLastId];
    return s ? shapeComposite.getSelectionScope(s) : undefined;
  }, [shapeComposite, selectedLastId]);

  const renderShape = useMemo(() => {
    const renderer = newShapeRenderer({
      shapeComposite,
      getDocumentMap: () => documentMap,
      imageStore,
      scale: 1,
    });
    return getRenderShapeFn(shapeComposite, renderer);
  }, [imageStore, shapeComposite, documentMap]);

  const rootNodeProps = useMemo(() => {
    return shapeComposite.mergedShapeTree
      .filter((n) => !hasSpecialOrderPriority(shapeComposite.getShapeStruct, shapeComposite.mergedShapeMap[n.id]))
      .map((n) =>
        getUITreeNodeProps(shapeComposite, selectedIdMap, selectedLastId, selectionScope, n, sheetColor, renderShape),
      );
  }, [shapeComposite, renderShape, selectedIdMap, selectedLastId, selectionScope, sheetColor]);

  const { handleEvent } = useContext(AppStateMachineContext);

  const handleNodeHover = useCallback(
    (id: string) => {
      handleEvent({
        type: "shape-highlight",
        data: { id, meta: { type: "outline" } },
      });
    },
    [handleEvent],
  );

  const handleNodeSelect = useCallback(
    (id: string, multi = false, range = false) => {
      const ctx = getCtx();

      if (multi) {
        ctx.multiSelectShapes([id], true);
      } else if (range) {
        selectShapesInRange(ctx, id);
      } else {
        ctx.selectShape(id);
        handleEvent({
          type: "state",
          data: {
            name: "PanToShape",
            options: {
              ids: [id],
              duration: 150,
            },
          },
        });
      }
    },
    [getCtx, handleEvent],
  );

  const handleDrop = useCallback(
    (targetIds: string[], toId: string, operation: DropOperation) => {
      const ctx = getCtx();
      const patchInfo = swapShapeParent(shapeComposite, targetIds, toId, operation, ctx.generateUuid);
      ctx.updateShapes(patchInfo);
    },
    [shapeComposite, getCtx],
  );

  const [draggingTarget, setDraggingTarget] = useState<[Element, id: string, IVec2]>();
  const [dropTo, setDropToRaw] = useState<[id: string, operation: DropOperation]>();

  const setDropTo = useCallback((val: [id: string, operation: DropOperation] | undefined) => {
    setDropToRaw((current) => {
      if (current?.[0] === val?.[0] && current?.[1] === val?.[1]) return current;
      return val;
    });
  }, []);

  const { startDragging } = useGlobalDrag(
    useCallback((e: PointerEvent) => {
      e.preventDefault();
      if (!e.currentTarget) return;

      setDraggingTarget((val) => (val ? [e.currentTarget as Element, val[1], { x: e.clientX, y: e.clientY }] : val));
    }, []),
    useCallback(() => {
      const ids = Object.keys(selectedIdMap);
      if (ids.length > 0 && dropTo) {
        handleDrop(ids, dropTo[0], dropTo[1]);
      }

      setDraggingTarget(undefined);
      setDropTo(undefined);
    }, [dropTo, setDropTo, handleDrop, selectedIdMap]),
  );

  const handleStartDragging = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (!e.currentTarget) return;

      setDraggingTarget([e.currentTarget, id, { x: e.clientX, y: e.clientY }]);
      startDragging();
    },
    [startDragging],
  );

  useEffect(() => {
    if (!rootRef.current) return;
    if (!draggingTarget) {
      setDropTo(undefined);
      return;
    }

    const hoveredElm = document.elementFromPoint(draggingTarget[2].x, draggingTarget[2].y);
    if (!hoveredElm) {
      setDropTo(undefined);
      return;
    }

    if (hoveredElm.getAttribute("data-drop-to-bottom-dummy")) {
      setDropTo([shapeComposite.mergedShapeTree[shapeComposite.mergedShapeTree.length - 1].id, "below"]);
      return;
    }

    const wrapperElm = hoveredElm.closest("[data-id]");
    if (!wrapperElm || !wrapperElm.getAttribute("data-draggable")) {
      setDropTo(undefined);
      return;
    }

    const anchorRootElm = wrapperElm.querySelector<HTMLElement>("[data-anchor-root]")!;
    const anchorRootRect = anchorRootElm.getBoundingClientRect();

    {
      const margin = 40;
      const shift = 6;
      const rootRect = rootRef.current.getBoundingClientRect();
      const p = draggingTarget[2];
      if (p.y <= rootRect.top + margin) {
        rootRef.current.scrollBy({ top: -shift });
      } else if (rootRect.bottom - margin <= p.y) {
        rootRef.current.scrollBy({ top: shift });
      }
    }

    const id = wrapperElm.getAttribute("data-id")!;
    if (id === draggingTarget[1]) {
      setDropTo(undefined);
      return;
    }

    const target = shapeComposite.mergedShapeTreeMap[id];
    const offsetRate = (draggingTarget[2].y - anchorRootRect.top) / anchorRootRect.height;

    if (offsetRate < 0.4) {
      setDropTo([id, "above"]);
    } else if (offsetRate < 0.6) {
      setDropTo([id, "group"]);
    } else if (offsetRate < 1 && target.children.length > 0) {
      setDropTo([target.children[0].id, "above"]);
    } else {
      // Note: "offsetRate" can be greater than 1. The destination should be below the target in that case.
      setDropTo([id, "below"]);
    }
  }, [setDropTo, draggingTarget, shapeComposite]);

  const rootNodeElms = useMemo(() => {
    return rootNodeProps.map((n) => (
      <li key={n.id} className="w-full">
        <UITreeNode
          {...n}
          dropTo={dropTo}
          onHover={handleNodeHover}
          onSelect={handleNodeSelect}
          onDragStart={handleStartDragging}
        />
      </li>
    ));
  }, [dropTo, handleNodeHover, handleNodeSelect, handleStartDragging, rootNodeProps]);

  return (
    <div ref={rootRef} className="h-full p-2 overflow-auto">
      <ul className="relative flex flex-col items-start" style={{ gap: 1 }}>
        {rootNodeElms}
        {draggingTarget ? (
          <div
            className="fixed left-6 px-1 w-40 h-4 rounded-xs left-0 bg-red-400 -translate-y-1/2 opacity-30 pointer-events-none touch-none"
            style={{
              top: `${draggingTarget[2].y}px`,
            }}
          />
        ) : undefined}
      </ul>
      <div data-drop-to-bottom-dummy className="h-4" />
    </div>
  );
};

interface UITreeNodeProps {
  id: string;
  name: string;
  childNode: UITreeNodeProps[];
  selected: boolean;
  prime: boolean;
  primeSibling: boolean;
  draggable: boolean;
  dropTo?: [string, DropOperation];
  sheetColor: string;
  renderShape: (id: string, canvas: HTMLCanvasElement | null) => void;
  onHover?: (id: string) => void;
  onSelect?: (id: string, multi?: boolean, range?: boolean) => void;
  onDragStart?: (e: React.PointerEvent, id: string) => void;
}

const NodeHeader: React.FC<Omit<UITreeNodeProps, "childNode"> & { dropElm?: React.ReactNode }> = memo(
  ({
    id,
    name,
    selected,
    prime,
    primeSibling,
    draggable,
    sheetColor,
    renderShape,
    onHover,
    onSelect,
    onDragStart,
    dropElm,
  }) => {
    const selectedClass = prime ? " bg-red-300 font-bold" : selected ? " bg-yellow-300 font-bold" : "";

    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      renderShape(id, canvasRef.current);
    }, [id, renderShape]);

    const handleNodeClick = useCallback(
      (e: React.PointerEvent) => {
        if (isCtrlOrMeta(e) && primeSibling) {
          onSelect?.(id, true);
        } else if (e.shiftKey && primeSibling) {
          onSelect?.(id, false, true);
        } else {
          onSelect?.(id);
        }
      },
      [id, onSelect, primeSibling],
    );

    const handleDragStart = useCallback(
      (e: React.PointerEvent) => {
        if (!draggable) return;

        if (!selected) {
          onSelect?.(id);
        }
        onDragStart?.(e, id);
      },
      [id, selected, onSelect, draggable, onDragStart],
    );

    const handleNodeSelectDown = useCallback(() => {
      onSelect?.(id, true);
    }, [id, onSelect]);

    const handleNodePointerEnter = useCallback(() => {
      onHover?.(id);
    }, [id, onHover]);

    return (
      <div data-anchor-root className="flex items-center relative">
        <div className={"ml-1 w-2  border-gray-400 " + (draggable ? "border-t-2" : "border-2 h-2 rounded-full")} />
        <ClickOrDragHandler
          className={"px-1 rounded-xs w-full hover:bg-gray-200" + selectedClass}
          onClick={handleNodeClick}
          onDragStart={handleDragStart}
        >
          <button type="button" className="flex items-center gap-2" onPointerEnter={handleNodePointerEnter}>
            <div className="border rounded-xs" style={{ backgroundColor: sheetColor, padding: 2 }}>
              <canvas ref={canvasRef} width="24" height="24" />
            </div>
            {name}
          </button>
        </ClickOrDragHandler>
        <div className={"ml-1 " + (primeSibling ? "" : "opacity-0")}>
          <ToggleInput value={selected} onChange={handleNodeSelectDown} />
        </div>
        {dropElm}
      </div>
    );
  },
);

const UITreeNode: React.FC<UITreeNodeProps> = ({
  id,
  name,
  childNode,
  selected,
  prime,
  primeSibling,
  draggable,
  dropTo,
  onHover,
  onSelect,
  onDragStart,
  sheetColor,
  renderShape,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prime || !rootRef.current) return;

    rootRef.current.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" });
  }, [prime]);

  const dropTarget = dropTo?.[0] === id;
  const dropGroupElm =
    dropTarget && dropTo[1] === "group" ? (
      <div className="absolute inset-0 border-2 border-green-500 rounded-xs pointer-events-none" />
    ) : undefined;
  const dropAboveElm =
    dropTarget && dropTo[1] === "above" ? (
      <div
        className={"absolute w-full h-1 bg-green-500 rounded-xs -translate-y-1/2 left-0 top-0 pointer-events-none"}
      />
    ) : undefined;
  const dropBelowElm =
    dropTarget && dropTo[1] === "below" ? (
      <div
        className={"absolute w-full h-1 bg-green-500 rounded-xs translate-y-1/2 left-0 bottom-0 pointer-events-none"}
      />
    ) : undefined;

  const hasChildren = childNode.length > 0;

  return (
    <div ref={rootRef} data-id={id} data-draggable={draggable || undefined} className="relative">
      <NodeHeader
        id={id}
        name={name}
        selected={selected}
        prime={prime}
        primeSibling={primeSibling}
        draggable={draggable}
        sheetColor={sheetColor}
        renderShape={renderShape}
        onHover={onHover}
        onSelect={onSelect}
        onDragStart={onDragStart}
        dropElm={dropGroupElm ?? dropAboveElm}
      />
      {hasChildren ? (
        <ul
          className="ml-2 relative border-l-2 border-gray-400 flex flex-col items-start"
          style={{ gap: 1, paddingBottom: 1 }}
        >
          {childNode.map((c) => (
            <li key={c.id} className="w-full">
              <UITreeNode {...c} dropTo={dropTo} onHover={onHover} onSelect={onSelect} onDragStart={onDragStart} />
            </li>
          ))}
          <div className="absolute left-0 right-0 bottom-0 border-t border-gray-400" />
        </ul>
      ) : undefined}
      {dropBelowElm}
    </div>
  );
};

function getUITreeNodeProps(
  shapeComposite: ShapeComposite,
  selectedIdMap: { [id: string]: true },
  lastSelectedId: string | undefined,
  selectedScope: ShapeSelectionScope | undefined,
  shapeNode: TreeNode,
  sheetColor: string,
  renderShape: (id: string, canvas: HTMLCanvasElement | null) => void,
): UITreeNodeProps {
  const shape = shapeComposite.shapeMap[shapeNode.id];
  const label = getLabel(shapeComposite.getShapeStruct, shape);
  const primeSibling = isSameShapeSelectionScope(selectedScope, shapeComposite.getSelectionScope(shape));
  const draggable = isDraggableShape(shapeComposite, shape.id);

  return {
    id: shapeNode.id,
    name: label,
    selected: !!selectedIdMap[shapeNode.id],
    prime: lastSelectedId === shapeNode.id,
    primeSibling: primeSibling,
    draggable,
    childNode: shapeNode.children.map((c) =>
      getUITreeNodeProps(shapeComposite, selectedIdMap, lastSelectedId, selectedScope, c, sheetColor, renderShape),
    ),
    renderShape,
    sheetColor,
  };
}

/**
 * Only shapes that are children of a container shape that acceps any shape types or have no parent are draggable.
 * This ristriction can be loosen, but things will become more complicated for sure.
 */
function isDraggableShape(shapeComposite: ShapeComposite, id: string): boolean {
  const shape = shapeComposite.shapeMap[id];
  const parent = shape.parentId ? shapeComposite.shapeMap[shape.parentId] : undefined;
  return !parent || isGroupShape(parent) || isAlignBoxShape(parent);
}

function getRenderShapeFn(shapeComposite: ShapeComposite, shapeRenderer: ShapeRenderer) {
  return (id: string, canvas: HTMLCanvasElement | null) => {
    const ctx = canvas?.getContext("2d");
    const s = shapeComposite.shapeMap[id];
    if (!canvas || !ctx || !s) return;

    const rect = shapeComposite.getWrapperRect(s, true);
    const w = Math.max(10, rect.width);
    const h = Math.max(10, rect.height);
    const [scaleW, scaleH] = [canvas.width / w, canvas.height / h];
    const scale = Math.min(scaleW, scaleH);
    const longSize = Math.max(w, h);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-rect.x + (longSize - rect.width) / 2, -rect.y + (longSize - rect.height) / 2);
    shapeRenderer.renderShape(ctx, id);
    ctx.restore();
  };
}
