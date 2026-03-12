import { add, IRectangle, IVec2 } from "okageo";
import { ContextMenuItem } from "../composables/states/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListButton, ListSpacer } from "./atoms/buttons/ListButton";
import { AppText } from "./molecules/AppText";
import iconDropdown from "../assets/icons/dropdown.svg";
import { Direction2, Size } from "../models";
import { createPortal } from "react-dom";
import { useRefWithDOMRect, useWithinArea } from "../hooks/domRect";
import { expandRect } from "../utils/geometry";

const PANEL_OFFSET = 4;

interface Props {
  items: ContextMenuItem[];
  point: IVec2;
  viewSize: Size;
  onClickItem?: (key: string, meta?: any) => void;
}

export const ContextMenu: React.FC<Props> = ({ items, point, onClickItem, viewSize }) => {
  const handleClick = useCallback(
    (item: ContextMenuItem) => {
      if ("separator" in item) return;
      onClickItem?.(item.key, item.meta);
    },
    [onClickItem],
  );

  const [ref, bounds] = useRefWithDOMRect();
  const baseBounds = useMemo<IRectangle | undefined>(() => {
    return bounds
      ? {
          x: point.x,
          y: point.y,
          width: bounds.width,
          height: bounds.height,
        }
      : undefined;
  }, [point, bounds]);
  const obstacle = useMemo<[IRectangle, Direction2] | undefined>(
    () => (baseBounds ? [{ x: baseBounds.x, y: baseBounds.y, width: 0, height: 0 }, 1] : undefined),
    [baseBounds],
  );
  const diff = useWithinArea(baseBounds ? expandRect(baseBounds, PANEL_OFFSET) : undefined, viewSize, obstacle);
  const p = diff && baseBounds ? add(diff, baseBounds) : point;

  return createPortal(
    <div
      ref={ref}
      className={"fixed border left-0 top-0 bg-white z-300" + (diff ? "" : " invisible")}
      style={{
        transform: `translate(${p.x}px, ${p.y}px)`,
      }}
    >
      <div className="flex flex-col">
        <ContextList items={items} viewSize={viewSize} onClickItem={handleClick} />
      </div>
    </div>,
    document.body,
  );
};

interface ContextListProps {
  items: ContextMenuItem[];
  viewSize: Size;
  onClickItem?: (item: ContextMenuItem) => void;
}

const ContextList: React.FC<ContextListProps> = ({ items, viewSize, onClickItem }) => {
  const [dropdownKey, setDropdownKey] = useState("");

  const handleClick = useCallback(
    (item: ContextMenuItem) => {
      if ("separator" in item) return;
      if (item.children?.length) {
        setDropdownKey((v) => (item.key === v ? "" : item.key));
        return;
      }

      onClickItem?.(item);
    },
    [onClickItem],
  );

  return (
    <div className="min-w-24">
      {items.map((item, i) => (
        <ContextItem key={i} item={item} viewSize={viewSize} dropdownKey={dropdownKey} onClickItem={handleClick} />
      ))}
    </div>
  );
};

interface ContextItemProps {
  item: ContextMenuItem;
  dropdownKey?: string;
  viewSize: Size;
  onClickItem?: (item: ContextMenuItem) => void;
}

const ContextItem: React.FC<ContextItemProps> = ({ item, viewSize, dropdownKey, onClickItem }) => {
  const handleClick = useCallback(() => {
    onClickItem?.(item);
  }, [item, onClickItem]);

  if ("separator" in item) return <ListSpacer />;
  if (!item.children || item.children.length === 0)
    return (
      <ListButton onClick={handleClick}>
        {item.icon ? (
          <div className="flex items-center gap-1">
            <img src={item.icon} alt="" className="w-6 h-6" />
            <AppText portal={true}>{item.label}</AppText>
          </div>
        ) : (
          <AppText portal={true}>{item.label}</AppText>
        )}
      </ListButton>
    );

  return (
    <div className="relative border-b last:border-none">
      {/* This div prevents redundant white space when child list displays. */}
      <div>
        <ListButton onClick={handleClick}>
          <div className="flex items-center justify-between gap-2 w-full">
            <AppText portal={true}>{item.label}</AppText>
            <img
              className={"w-3 h-3 transition-transform " + (dropdownKey === item.key ? "rotate-90" : "-rotate-90")}
              src={iconDropdown}
              alt=""
            />
          </div>
        </ListButton>
      </div>
      {dropdownKey === item.key ? (
        <ChildContextList items={item.children} viewSize={viewSize} onClickItem={onClickItem} />
      ) : undefined}
    </div>
  );
};

interface ChildContextList {
  items: ContextMenuItem[];
  viewSize: Size;
  onClickItem?: (item: ContextMenuItem) => void;
}

const ChildContextList: React.FC<ChildContextList> = ({ items, viewSize, onClickItem }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState("opacity-0 left-full top-1/2 -translate-y-1/2");

  useEffect(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    setStyle(
      (rect.right > viewSize.width + PANEL_OFFSET ? "right-full " : "left-full ") +
        (rect.bottom > viewSize.height + PANEL_OFFSET ? "bottom-0" : "top-1/2 -translate-y-1/2"),
    );
  }, [viewSize]);

  return (
    <div ref={ref} className={"absolute border bg-white w-max " + style}>
      <ContextList items={items} viewSize={viewSize} onClickItem={onClickItem} />
    </div>
  );
};
