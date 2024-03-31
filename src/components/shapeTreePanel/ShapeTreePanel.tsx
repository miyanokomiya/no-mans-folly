import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ShapeComposite, swapShapeParent } from "../../composables/shapeComposite";
import { useSelectedShapeInfo, useShapeComposite } from "../../hooks/storeHooks";
import { TreeNode } from "../../utils/tree";
import { AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import plusIcon from "../../assets/icons/plus.svg";
import minusIcon from "../../assets/icons/minus.svg";
import { ShapeSelectionScope, isSameShapeSelectionScope } from "../../shapes/core";
import { useGlobalDrag } from "../../hooks/window";
import { IVec2 } from "okageo";
import { isGroupShape } from "../../shapes/group";

type DropOperation = "group" | "above" | "below";

export const ShapeTreePanel: React.FC = () => {
  const shapeComposite = useShapeComposite();
  const { idMap: selectedIdMap, lastId: selectedLastId } = useSelectedShapeInfo();
  const selectionScope = useMemo(() => {
    if (!selectedLastId) return;

    return shapeComposite.getSelectionScope(shapeComposite.shapeMap[selectedLastId]);
  }, [shapeComposite, selectedLastId]);

  const rootNodeProps = useMemo(() => {
    return shapeComposite.mergedShapeTree.map((n) =>
      getUITreeNodeProps(shapeComposite, selectedIdMap, selectedLastId, selectionScope, n),
    );
  }, [shapeComposite, selectedIdMap, selectedLastId, selectionScope]);

  const { handleEvent } = useContext(AppStateMachineContext);
  const getCtx = useContext(GetAppStateContext);

  const handleNodeSelect = useCallback(
    (id: string, multi = false) => {
      const ctx = getCtx();

      if (multi) {
        ctx.multiSelectShapes([id], true);
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
    (targetId: string, toId: string, operation: DropOperation) => {
      const ctx = getCtx();
      const patchInfo = swapShapeParent(shapeComposite, targetId, toId, operation, ctx.generateUuid);
      ctx.updateShapes(patchInfo);
    },
    [shapeComposite, getCtx],
  );

  const [draggingTarget, setDraggingTarget] = useState<[Element, id: string, IVec2]>();
  const [dropTo, setDropTo] = useState<[id: string, operation: DropOperation]>();

  const { startDragging } = useGlobalDrag(
    useCallback((e: PointerEvent) => {
      e.preventDefault();
      if (!e.currentTarget) return;

      setDraggingTarget((val) => (val ? [e.currentTarget as Element, val[1], { x: e.clientX, y: e.clientY }] : val));
    }, []),
    useCallback(() => {
      if (draggingTarget && dropTo) {
        handleDrop(draggingTarget[1], dropTo[0], dropTo[1]);
      }

      setDraggingTarget(undefined);
      setDropTo(undefined);
    }, [draggingTarget, dropTo, handleDrop]),
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
    if (!draggingTarget) {
      setDropTo(undefined);
      return;
    }

    const anchorElm = document.elementFromPoint(draggingTarget[2].x, draggingTarget[2].y);
    const wrapperElm = anchorElm?.closest("[data-id]");
    if (!wrapperElm || !wrapperElm.getAttribute("data-draggable")) {
      setDropTo(undefined);
      return;
    }

    const id = wrapperElm.getAttribute("data-id")!;
    if (id === draggingTarget[1]) {
      setDropTo(undefined);
      return;
    }

    const rect = wrapperElm.querySelector("[data-anchor]")!.getBoundingClientRect();
    const offsetRate = (draggingTarget[2].y - rect.top) / rect.height;
    const operation = offsetRate < 0.4 ? "above" : offsetRate < 0.6 ? "group" : "below";
    setDropTo([id, operation]);
  }, [draggingTarget]);

  return (
    <div>
      <ul className="relative">
        {rootNodeProps.map((n) => (
          <li key={n.id}>
            <UITreeNode {...n} dropTo={dropTo} onSelect={handleNodeSelect} onDragStart={handleStartDragging} />
          </li>
        ))}
        {draggingTarget ? (
          <div
            className="fixed left-6 px-1 w-40 h-4 rounded left-0 bg-red-400 -translate-y-1/2 opacity-30 pointer-events-none touch-none"
            style={{
              top: `${draggingTarget[2].y}px`,
            }}
          />
        ) : undefined}
      </ul>
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
  onSelect?: (id: string, multi?: boolean) => void;
  onDragStart?: (e: React.PointerEvent, id: string) => void;
}

const UITreeNode: React.FC<UITreeNodeProps> = ({
  id,
  name,
  childNode,
  selected,
  prime,
  primeSibling,
  draggable,
  dropTo,
  onSelect,
  onDragStart,
}) => {
  const handleNodeDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onSelect?.(id);

      if (draggable) {
        onDragStart?.(e, id);
      }
    },
    [id, onSelect, draggable, onDragStart],
  );

  const handleNodeSelectDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onSelect?.(id, true);
    },
    [id, onSelect],
  );

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prime || !rootRef.current) return;

    rootRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [prime]);

  const selectedClass = prime ? " bg-red-300 font-bold" : selected ? " bg-yellow-300 font-bold" : "";

  return (
    <div ref={rootRef} data-id={id} data-draggable={draggable || undefined}>
      <div data-anchor className="flex items-center relative">
        <div className={"ml-1 w-2  border-gray-400 " + (draggable ? "border-t-2" : "border-2 h-2 rounded-full")} />
        <button
          type="button"
          className={"px-1 rounded w-full text-left select-none touch-none" + selectedClass}
          onPointerDown={handleNodeDown}
        >
          {name}
        </button>
        {primeSibling ? (
          <button
            type="button"
            className="ml-1 border border-gray-400 rounded-full flex items-center justify-center"
            onPointerDown={handleNodeSelectDown}
          >
            {selected ? (
              <img className="w-4 h-4" src={minusIcon} alt="Deselect" />
            ) : (
              <img className="w-4 h-4" src={plusIcon} alt="Select" />
            )}
          </button>
        ) : undefined}
        {dropTo?.[0] === id ? (
          dropTo[1] === "group" ? (
            <div className="absolute inset-0 border-2 border-green-500 rounded pointer-events-none" />
          ) : (
            <div
              className={
                "absolute w-full h-1 bg-green-500 rounded -translate-y-1/2 left-0 pointer-events-none " +
                (dropTo[1] === "above" ? "top-0" : "top-full")
              }
            />
          )
        ) : undefined}
      </div>
      <ul className="ml-2 border-l-2 border-gray-400">
        {childNode.map((c) => (
          <li key={c.id}>
            <UITreeNode {...c} dropTo={dropTo} onSelect={onSelect} onDragStart={onDragStart} />
          </li>
        ))}
      </ul>
    </div>
  );
};

function getUITreeNodeProps(
  shapeComposite: ShapeComposite,
  selectedIdMap: { [id: string]: true },
  lastSelectedId: string | undefined,
  selectedScope: ShapeSelectionScope | undefined,
  shapeNode: TreeNode,
): UITreeNodeProps {
  const shape = shapeComposite.shapeMap[shapeNode.id];
  const label = shapeComposite.getShapeStruct(shape.type).label;
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
      getUITreeNodeProps(shapeComposite, selectedIdMap, lastSelectedId, selectedScope, c),
    ),
  };
}

/**
 * Only shapes that are children of a group shape or have no parent are draggable.
 * This ristriction can be loosen, but things will become more complicated for sure.
 */
function isDraggableShape(shapeComposite: ShapeComposite, id: string): boolean {
  const shape = shapeComposite.shapeMap[id];
  const parent = shape.parentId ? shapeComposite.shapeMap[shape.parentId] : undefined;
  return !parent || isGroupShape(parent);
}
