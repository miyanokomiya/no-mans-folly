import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ShapeComposite, swapShapeParent } from "../../composables/shapeComposite";
import { useSelectedShapeInfo, useSelectedSheet, useShapeCompositeWithoutTmpInfo } from "../../hooks/storeHooks";
import { TreeNode } from "../../utils/tree";
import { AppStateMachineContext, GetAppStateContext } from "../../contexts/AppContext";
import { ShapeSelectionScope, isSameShapeSelectionScope } from "../../shapes/core";
import { useGlobalDrag } from "../../hooks/window";
import { IVec2 } from "okageo";
import { getModifierOptions } from "../../utils/devices";
import { selectShapesInRange } from "../../composables/states/appCanvas/commons";
import { rednerRGBA } from "../../utils/color";
import { FrameShape, isFrameShape } from "../../shapes/frame";
import { FrameItem } from "./FrameItem";
import { FrameThumbnail } from "./FrameThumbnail";
import { ImageStore } from "../../composables/imageStore";
import { DocOutput } from "../../models/document";
import { FrameGroup } from "../../shapes/frameGroups/core";
import { createNewFrameFromSrc, getAllFrameShapes, getFrameTree } from "../../composables/frame";
import { generateKeyBetweenAllowSame } from "../../utils/findex";

type DropOperation = "above" | "below";

export const FrameTreePanel: React.FC = () => {
  const getCtx = useContext(GetAppStateContext);
  const sheet = useSelectedSheet();
  const sheetColor = sheet?.bgcolor ? rednerRGBA(sheet.bgcolor) : "#fff";
  const documentMap = getCtx().getDocumentMap();
  const imageStore = getCtx().getImageStore();

  const shapeComposite = useShapeCompositeWithoutTmpInfo();
  const { idMap: selectedIdMap, lastId: selectedLastId } = useSelectedShapeInfo();
  const selectionScope = useMemo(() => {
    if (!selectedLastId) return;

    return shapeComposite.getSelectionScope(shapeComposite.shapeMap[selectedLastId]);
  }, [shapeComposite, selectedLastId]);

  const rootNodeProps = useMemo(() => {
    return getFrameTree(shapeComposite).map((n, i) =>
      getUITreeNodeProps(
        shapeComposite,
        selectedIdMap,
        selectedLastId,
        selectionScope,
        n,
        i,
        sheetColor,
        documentMap,
        imageStore,
      ),
    );
  }, [shapeComposite, selectedIdMap, selectedLastId, selectionScope, sheetColor, documentMap, imageStore]);

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
    (id: string, multi = false, range = false, noZoom = false) => {
      const ctx = getCtx();

      if (multi) {
        ctx.multiSelectShapes([id], true);
      } else if (range) {
        selectShapesInRange(ctx, id);
      } else {
        ctx.selectShape(id);
        if (!noZoom) {
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

  const [draggingTarget, setDraggingTarget] = useState<[id: string, IVec2]>();
  const [dropTo, setDropTo] = useState<[id: string, operation: DropOperation]>();

  const { startDragging } = useGlobalDrag(
    useCallback((e: PointerEvent) => {
      e.preventDefault();
      if (!e.currentTarget) return;

      setDraggingTarget((val) => (val ? [val[0], { x: e.clientX, y: e.clientY }] : val));
    }, []),
    useCallback(() => {
      if (draggingTarget && dropTo) {
        handleDrop(draggingTarget[0], dropTo[0], dropTo[1]);
      }

      setDraggingTarget(undefined);
      setDropTo(undefined);
    }, [draggingTarget, dropTo, handleDrop]),
  );

  const handleStartDragging = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (!e.currentTarget) return;

      setDraggingTarget([id, { x: e.clientX, y: e.clientY }]);
      startDragging();
    },
    [startDragging],
  );

  useEffect(() => {
    if (!draggingTarget) {
      setDropTo(undefined);
      return;
    }

    const hoveredElm = document.elementFromPoint(draggingTarget[1].x, draggingTarget[1].y);
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

    const id = wrapperElm.getAttribute("data-id")!;
    if (id === draggingTarget[0]) {
      setDropTo(undefined);
      return;
    }

    const target = shapeComposite.mergedShapeTreeMap[id];
    const rect = wrapperElm.querySelector("[data-anchor-root]")!.getBoundingClientRect();
    const offsetRate = (draggingTarget[1].y - rect.top) / rect.height;

    if (offsetRate < 0.5) {
      setDropTo([id, "above"]);
    } else if (offsetRate < 1 && target.children.length > 0) {
      setDropTo([target.children[0].id, "above"]);
    } else {
      // Note: "offsetRate" can be greater than 1. The destination should be below the target in that case.
      setDropTo([id, "below"]);
    }
  }, [draggingTarget, shapeComposite]);

  const handleNameChange = useCallback(
    (id: string, name: string) => {
      const ctx = getCtx();
      ctx.patchShapes({ [id]: { name } as Partial<FrameShape> });
    },
    [getCtx],
  );

  const handleInsertBelow = useCallback(
    (id: string) => {
      const ctx = getCtx();
      const src = shapeComposite.shapeMap[id] as FrameShape;
      const frameShapes = getAllFrameShapes(shapeComposite);
      const srcIndex = frameShapes.findIndex((f) => f.id === src.id);
      const nextFrame = frameShapes.at(srcIndex + 1);
      const shape = createNewFrameFromSrc(
        ctx.getShapeStruct,
        src,
        ctx.generateUuid(),
        generateKeyBetweenAllowSame(src.findex, nextFrame?.findex),
      );

      ctx.addShapes([shape]);
      ctx.selectShape(shape.id);
    },
    [getCtx, shapeComposite],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const ctx = getCtx();
      ctx.deleteShapes([id]);
    },
    [getCtx],
  );

  return (
    <div>
      <ul className="relative flex flex-col items-start" style={{ gap: 1 }}>
        {rootNodeProps.map((n) => (
          <li key={n.id} className="w-full">
            <UITreeNode
              {...n}
              dropTo={dropTo}
              onHover={handleNodeHover}
              onSelect={handleNodeSelect}
              onDragStart={handleStartDragging}
              onNameChange={handleNameChange}
              onInsertBelow={handleInsertBelow}
              onDelete={handleDelete}
            />
          </li>
        ))}
        {draggingTarget ? (
          <div
            className="fixed left-6 px-1 w-40 h-4 rounded-xs left-0 bg-red-400 -translate-y-1/2 opacity-30 pointer-events-none touch-none"
            style={{
              top: `${draggingTarget[1].y}px`,
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
  index: number;
  childNode: UITreeNodeProps[];
  selected: boolean;
  prime: boolean;
  primeSibling: boolean;
  draggable: boolean;
  dropTo?: [string, DropOperation];
  onHover?: (id: string) => void;
  onSelect?: (id: string, multi?: boolean, range?: boolean, noZoom?: boolean) => void;
  onDragStart?: (e: React.PointerEvent, id: string) => void;
  onNameChange?: (id: string, name: string) => void;
  onInsertBelow?: (id: string) => void;
  onDelete?: (id: string) => void;
  sheetColor: string;
  getThumbnail?: () => React.ReactNode;
}

const UITreeNode: React.FC<UITreeNodeProps> = ({
  id,
  name,
  index,
  childNode,
  selected,
  prime,
  primeSibling,
  draggable,
  dropTo,
  onHover,
  onSelect,
  onDragStart,
  onNameChange,
  onInsertBelow,
  onDelete,
  getThumbnail,
}) => {
  const handleSelect = useCallback(
    (e: React.MouseEvent, noZoom = false) => {
      const option = getModifierOptions(e);
      if (option.ctrl && primeSibling) {
        onSelect?.(id, true);
        return;
      }
      if (option.shift && primeSibling) {
        onSelect?.(id, false, true);
        return;
      }

      if (!selected) {
        onSelect?.(id, false, false, noZoom);
      }
    },
    [id, onSelect, primeSibling, selected],
  );

  const handleNodeDown = useCallback(
    (e: React.PointerEvent) => {
      handleSelect(e, true);

      if (draggable) {
        onDragStart?.(e, id);
      }
    },
    [id, handleSelect, draggable, onDragStart],
  );

  const handleNodePointerEnter = useCallback(() => {
    onHover?.(id);
  }, [id, onHover]);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prime || !rootRef.current) return;

    rootRef.current.scrollIntoView({ behavior: "instant", block: "nearest", inline: "nearest" });
  }, [prime]);

  const dropTarget = dropTo?.[0] === id;
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
  const selectedClass = prime ? " bg-red-300 font-bold" : selected ? " bg-yellow-300 font-bold" : " hover:bg-gray-200";

  return (
    <div
      ref={rootRef}
      data-id={id}
      data-draggable={draggable || undefined}
      className={"relative" + (childNode.length === 0 ? " pt-1" : " pb-1")}
    >
      <div data-anchor-root className="flex items-center relative">
        <div
          className={"rounded-xs w-full flex items-center gap-2 select-none touch-none" + selectedClass}
          onPointerEnter={handleNodePointerEnter}
        >
          <FrameItem
            id={id}
            name={name}
            index={index}
            onDown={handleNodeDown}
            onSelect={handleSelect}
            onNameChange={onNameChange}
            onInsertBelow={onInsertBelow}
            onDelete={onDelete}
          >
            {getThumbnail ? <div className="h-24">{getThumbnail()}</div> : undefined}
          </FrameItem>
        </div>
        {dropAboveElm}
      </div>
      {hasChildren ? (
        <ul className="ml-2 pl-2 pb-1 relative border-l-2 border-gray-400 flex flex-col items-start">
          {childNode.map((c) => (
            <li key={c.id} className="w-full">
              <UITreeNode
                {...c}
                dropTo={dropTo}
                onHover={onHover}
                onSelect={onSelect}
                onDragStart={onDragStart}
                onNameChange={onNameChange}
                onInsertBelow={onInsertBelow}
                onDelete={onDelete}
              />
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
  index: number,
  sheetColor: string,
  documentMap: { [id: string]: DocOutput },
  imageStore: ImageStore,
): UITreeNodeProps {
  const shape = shapeComposite.shapeMap[shapeNode.id] as FrameShape | FrameGroup;
  const primeSibling = isSameShapeSelectionScope(selectedScope, shapeComposite.getSelectionScope(shape));

  return {
    id: shapeNode.id,
    name: shape.name,
    index,
    selected: !!selectedIdMap[shapeNode.id],
    prime: lastSelectedId === shapeNode.id,
    primeSibling: primeSibling,
    draggable: true,
    childNode: shapeNode.children.map((c, i) =>
      getUITreeNodeProps(
        shapeComposite,
        selectedIdMap,
        lastSelectedId,
        selectedScope,
        c,
        i,
        sheetColor,
        documentMap,
        imageStore,
      ),
    ),
    sheetColor,
    getThumbnail: isFrameShape(shape)
      ? () => (
          <FrameThumbnail
            shapeComposite={shapeComposite}
            frame={shape}
            documentMap={documentMap}
            imageStore={imageStore}
            backgroundColor={sheetColor}
          />
        )
      : undefined,
  };
}
