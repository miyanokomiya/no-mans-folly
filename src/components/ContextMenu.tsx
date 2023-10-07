import { IVec2 } from "okageo";
import { ContextMenuItem } from "../composables/states/types";
import { useMemo } from "react";
import { ListButton } from "./atoms/buttons/ListButton";

interface Props {
  items: ContextMenuItem[];
  point: IVec2;
  onClickItem?: (key: string) => void;
}

export const ContextMenu: React.FC<Props> = ({ items, point, onClickItem }) => {
  const itemElm = useMemo(() => {
    return items.map((item) => (
      <ListButton key={item.key} onClick={() => onClickItem?.(item.key)}>
        {item.label}
      </ListButton>
    ));
  }, [items, onClickItem]);

  return (
    <div
      className="fixed border left-0 top-0 bg-white"
      style={{
        transform: `translate(${point.x}px, ${point.y}px)`,
      }}
    >
      <div className="flex flex-col">{itemElm}</div>
    </div>
  );
};
