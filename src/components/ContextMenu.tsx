import { add, IVec2 } from "okageo";
import { ContextMenuItem } from "../composables/states/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { ListButton, ListSpacer } from "./atoms/buttons/ListButton";
import { AppText } from "./molecules/AppText";
import iconDropdown from "../assets/icons/dropdown.svg";
import { Size } from "../models";

interface Props {
  items: ContextMenuItem[];
  point: IVec2;
  onClickItem?: (key: string, meta?: any) => void;
  getContainerSize?: () => Size;
}

export const ContextMenu: React.FC<Props> = ({ items, point, onClickItem, getContainerSize }) => {
  const handleClick = useCallback(
    (item: ContextMenuItem) => {
      if ("separator" in item) return;
      onClickItem?.(item.key, item.meta);
    },
    [onClickItem],
  );

  const ref = useRef<HTMLDivElement>(null);
  const { diff } = usePanelWithinViewport(ref, getContainerSize);
  const p = diff ? add(diff, point) : point;

  return (
    <div
      ref={ref}
      className={"fixed border left-0 top-0 bg-white" + (diff ? "" : " opacity-0")}
      style={{
        transform: `translate(${p.x}px, ${p.y}px)`,
      }}
    >
      <div className="flex flex-col">
        <ContextList items={items} onClickItem={handleClick} />
      </div>
    </div>
  );
};

interface ContextListProps {
  items: ContextMenuItem[];
  onClickItem?: (item: ContextMenuItem) => void;
}

const ContextList: React.FC<ContextListProps> = ({ items, onClickItem }) => {
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

  return items.map((item, i) => (
    <ContextItem key={i} item={item} dropdownKey={dropdownKey} onClickItem={handleClick} />
  ));
};

interface ContextItemProps {
  item: ContextMenuItem;
  dropdownKey?: string;
  onClickItem?: (item: ContextMenuItem) => void;
}

const ContextItem: React.FC<ContextItemProps> = ({ item, dropdownKey, onClickItem }) => {
  const handleClick = useCallback(() => {
    onClickItem?.(item);
  }, [item, onClickItem]);

  if ("separator" in item) return <ListSpacer />;
  if (!item.children || item.children.length === 0)
    return (
      <ListButton onClick={handleClick}>
        <AppText portal={true}>{item.label}</AppText>
      </ListButton>
    );

  return (
    <div className="relative">
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
        <div className="absolute left-full top-1/2 -translate-y-1/2 border bg-white w-max">
          <ContextList items={item.children} onClickItem={onClickItem} />
        </div>
      ) : undefined}
    </div>
  );
};

const PANEL_OFFSET = 4;

const usePanelWithinViewport = (panelRef: React.RefObject<HTMLElement>, getContainerSize?: () => Size) => {
  const [diff, setDiff] = useState<IVec2>();

  useEffect(() => {
    if (!panelRef.current || !getContainerSize) return;

    const viewportSize = getContainerSize();
    const rect = panelRef.current.getBoundingClientRect();
    let dx = 0;
    if (rect.right > viewportSize.width + PANEL_OFFSET) {
      dx = -rect.width;
    }
    let dy = 0;
    if (rect.bottom > viewportSize.height + PANEL_OFFSET) {
      dy = viewportSize.height - rect.bottom - PANEL_OFFSET;
    }
    setDiff({ x: dx, y: dy });
  }, [panelRef, getContainerSize]);

  return { diff };
};
