import { IRectangle, IVec2, add, getRectCenter } from "okageo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Size } from "../../models";
import { canvasToView } from "../../hooks/canvas";
import { DocAttrInfo } from "../../models/document";
import { useDraggable } from "../../hooks/draggable";
import { ClickOrDragHandler } from "../atoms/ClickOrDragHandler";
import { FloatMenuInspector } from "./FloatMenuInspector";
import { useShapeComposite, useShapeSelectedMap } from "../../hooks/storeHooks";
import { FloatMenuSmartBranch } from "./FloatMenuSmartBranch";
import { FloatMenuLineSegment } from "./FloatMenuLineSegment";
import { FloatMenuOption } from "../../composables/states/commons";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

type Option = FloatMenuOption & {
  canvasState: any;
  scale: number;
  viewOrigin: IVec2;
  viewSize: Size;
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
  textEditing: boolean;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
};

export const FloatMenu: React.FC<Option> = ({
  canvasState,
  scale,
  viewOrigin,
  viewSize,
  targetRect,
  type,
  data,
  indexDocAttrInfo,
  focusBack,
  textEditing,
  onContextMenu,
}) => {
  const draggable = useDraggable();

  const rootRef = useRef<HTMLDivElement>(null);
  // Once the menu was dragged, stick it to the location.
  // This point refers to the drag-anchor.
  const [rootFixed, setRootFixed] = useLocalStorageAdopter<IVec2 | undefined>({
    key: "float-menu-fixed",
    version: "1",
    initialValue: undefined,
    duration: 1000,
  });
  const [dragOrigin, setDragOrigin] = useState<IVec2 | undefined>();

  const shapeComposite = useShapeComposite();
  const selectedMap = useShapeSelectedMap();

  const adjustedTargetRect = useMemo<IRectangle | undefined>(() => {
    const selectedShapes = Object.keys(selectedMap).map((id) => shapeComposite.shapeMap[id]);
    if (!targetRect && selectedShapes.length === 0) return;

    const rect = targetRect ?? shapeComposite.getWrapperRectForShapes(selectedShapes, true);
    const p = canvasToView(scale, viewOrigin, rect);
    const width = rect.width / scale;
    const height = rect.height / scale;
    return { x: p.x, y: p.y, width, height };
  }, [viewOrigin, scale, targetRect, shapeComposite, selectedMap]);

  useEffect(() => {
    if (!dragOrigin || !draggable.v) return;

    const p = add(dragOrigin, draggable.v);
    setRootFixed(p);
  }, [dragOrigin, draggable.v, setRootFixed]);

  const [rootAttrs, setRootAttrs] = useState<{ className?: string; style?: React.CSSProperties }>({
    className: rootBaseClassName + " invisible",
  });
  const updateRootAttrs = useCallback(() => {
    if (!adjustedTargetRect || !rootRef.current) {
      // Need to render the menu to get its size, but make it invisible until everything's ready.
      setRootAttrs({ className: rootBaseClassName + " invisible" });
      return;
    }

    const bounds = rootRef.current.getBoundingClientRect();
    setRootAttrs(
      getRootAttrs(
        adjustedTargetRect,
        bounds.width,
        bounds.height,
        viewSize.width,
        viewSize.height,
        rootFixed ? { x: rootFixed.x + bounds.width / 2, y: rootFixed.y } : undefined,
      ),
    );
  }, [adjustedTargetRect, viewSize, rootFixed]);

  useEffect(() => {
    updateRootAttrs();
  }, [updateRootAttrs]);

  const handleMenuAnchorDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!rootRef.current) return;

      const bounds = rootRef.current.getBoundingClientRect();
      setDragOrigin({ x: bounds.x, y: bounds.y });
      draggable.clear();
      draggable.startDrag(e);
    },
    [draggable],
  );

  const handleMenuAnchorClick = useCallback(() => {
    draggable.clear();
    setDragOrigin(undefined);
    setRootFixed(undefined);
  }, [draggable, setRootFixed]);

  if (!adjustedTargetRect) return;
  return createPortal(
    <div ref={rootRef} {...rootAttrs}>
      <div className="absolute top-0 -left-[20px] bg-white px-1 h-9 rounded-l">
        <ClickOrDragHandler
          onClick={handleMenuAnchorClick}
          onDragStart={handleMenuAnchorDrag}
          className="self-stretch my-1"
        >
          <div className={"w-3 h-7 border rounded-xs touch-none" + (rootFixed ? " bg-blue-300" : " bg-gray-300")} />
        </ClickOrDragHandler>
      </div>
      <div>
        {type === "smart-branch" ? (
          <FloatMenuSmartBranch />
        ) : type === "line-segment" ? (
          <FloatMenuLineSegment {...data} />
        ) : (
          <FloatMenuInspector
            canvasState={canvasState}
            indexDocAttrInfo={indexDocAttrInfo}
            focusBack={focusBack}
            textEditing={textEditing}
            onContextMenu={onContextMenu}
          />
        )}
      </div>
    </div>,
    document.body,
  );
};

const TOP_LOCATED_KEY = "top-located";
const rootBaseClassName = "fixed border rounded-xs rounded-tl-none shadow-xs w-max h-max bg-white top-0 left-0 z-300";

function getRootAttrs(
  targetRect: IRectangle,
  rootWidth: number,
  rootHeight: number,
  windowWidth: number,
  windowHeight: number,
  fixed?: IVec2,
) {
  const yMargin = 60;
  const center = getRectCenter(targetRect);
  const topY = targetRect.y - yMargin - rootHeight;
  const toBottom = topY < 0;
  const p = fixed ?? {
    x: center.x,
    y: toBottom ? targetRect.y + targetRect.height + yMargin : topY,
  };

  const minX = 16;
  const dx = Math.min(windowWidth - (p.x + rootWidth / 2), 0);
  const tx = p.x - rootWidth / 2 < minX ? `${minX}px` : `calc(${p.x + dx}px - 50%)`;
  const dy = Math.min(windowHeight - (p.y + rootHeight), 0);
  const ty = p.y < 0 ? "0" : `calc(${p.y + dy}px)`;
  return {
    className: rootBaseClassName + (toBottom ? "" : ` ${TOP_LOCATED_KEY}`),
    style: {
      transform: `translate(${tx}, ${ty})`,
    },
  };
}
