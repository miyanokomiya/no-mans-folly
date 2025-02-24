import { IRectangle, IVec2, add, getRectCenter } from "okageo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Size } from "../../models";
import { canvasToView } from "../../hooks/canvas";
import { DocAttrInfo } from "../../models/document";
import { useDraggable } from "../../hooks/draggable";
import { ClickOrDragHandler } from "../atoms/ClickOrDragHandler";
import { FloatMenuInspector } from "./FloatMenuInspector";
import { useSelectedShapes, useShapeComposite } from "../../hooks/storeHooks";
import { FloatMenuSmartBranch } from "./FloatMenuSmartBranch";

// Use default root height until it's derived from actual element.
// => It's useful to prevent the menu from slightly translating at the first appearance.
const ROOT_HEIGHT = 44;

// Keep and restore the fixed location.
let rootFixedCache: IVec2 | undefined;

interface Option {
  canvasState: any;
  scale: number;
  viewOrigin: IVec2;
  viewSize: Size;
  targetRect?: IRectangle;
  type?: string;
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
  textEditing: boolean;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
}

export const FloatMenu: React.FC<Option> = ({
  canvasState,
  scale,
  viewOrigin,
  viewSize,
  targetRect,
  type,
  indexDocAttrInfo,
  focusBack,
  textEditing,
  onContextMenu,
}) => {
  const draggable = useDraggable();

  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState<Size>({ width: 0, height: ROOT_HEIGHT });
  // Once the menu was dragged, stick it to the location.
  const [rootFixed, setRootFixed] = useState<IVec2 | undefined>(rootFixedCache);
  const [dragOrigin, setDragOrigin] = useState<IVec2 | undefined>();

  const shapeComposite = useShapeComposite();
  const selectedShapes = useSelectedShapes();

  const adjustedTargetRect = useMemo<IRectangle | undefined>(() => {
    if (!targetRect && selectedShapes.length === 0) return;

    const rect = targetRect ?? shapeComposite.getWrapperRectForShapes(selectedShapes, true);
    const p = canvasToView(scale, viewOrigin, rect);
    const width = rect.width / scale;
    const height = rect.height / scale;
    return { x: p.x, y: p.y, width, height };
  }, [viewOrigin, scale, targetRect, shapeComposite, selectedShapes]);

  useEffect(() => {
    if (!rootRef.current) return;

    const bounds = rootRef.current.getBoundingClientRect();
    setRootSize({ width: bounds.width, height: bounds.height });
  }, [adjustedTargetRect]);

  useEffect(() => {
    if (!dragOrigin || !draggable.v) return;

    const p = add(dragOrigin, draggable.v);
    setRootFixed(p);
  }, [dragOrigin, draggable.v]);

  const rootAttrs = useMemo(() => {
    if (!adjustedTargetRect || !rootRef.current) {
      // Need to render the menu to get its size, but make it invisible until everything's ready.
      return { className: rootBaseClassName + " invisible" };
    }

    return getRootAttrs(
      adjustedTargetRect,
      rootSize.width,
      rootSize.height,
      viewSize.width,
      viewSize.height,
      rootFixed,
    );
  }, [adjustedTargetRect, viewSize, rootSize.width, rootSize.height, rootFixed]);

  const handleMenuAnchorDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!rootRef.current) return;

      const bounds = rootRef.current.getBoundingClientRect();
      setDragOrigin({ x: bounds.x + bounds.width / 2, y: bounds.y });
      draggable.clear();
      draggable.startDrag(e);
    },
    [draggable],
  );

  const handleMenuAnchorClick = useCallback(() => {
    draggable.clear();
    setDragOrigin(undefined);
    setRootFixed(undefined);
  }, [draggable]);

  useEffect(() => {
    rootFixedCache = rootFixed;
  }, [rootFixed]);

  return adjustedTargetRect ? (
    <div ref={rootRef} {...rootAttrs}>
      <div className="flex gap-1 items-center">
        <ClickOrDragHandler
          onClick={handleMenuAnchorClick}
          onDragStart={handleMenuAnchorDrag}
          className="self-stretch my-1"
        >
          <div className={"w-3 h-full border rounded-xs touch-none" + (rootFixed ? " bg-blue-300" : " bg-gray-300")} />
        </ClickOrDragHandler>
        {type === "smart-branch" ? (
          <FloatMenuSmartBranch />
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
    </div>
  ) : undefined;
};

const TOP_LOCATED_KEY = "top-located";
const rootBaseClassName = "fixed border rounded-xs shadow-xs w-max h-max bg-white px-1 top-0 left-0";

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

  const dx = Math.min(windowWidth - (p.x + rootWidth / 2), 0);
  const tx = p.x - rootWidth / 2 < 0 ? "0" : `calc(${p.x + dx}px - 50%)`;
  const dy = Math.min(windowHeight - (p.y + rootHeight), 0);
  const ty = p.y < 0 ? "0" : `calc(${p.y + dy}px)`;
  return {
    className: rootBaseClassName + (toBottom ? "" : ` ${TOP_LOCATED_KEY}`),
    style: {
      transform: `translate(${tx}, ${ty})`,
    },
  };
}
