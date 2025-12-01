import { useCallback } from "react";

export type TabPanelItem = [{ name: string; keepAlive?: boolean }, React.ReactNode, noPadding?: boolean];

interface Props {
  selected: string;
  items: TabPanelItem[];
  onSelect?: (name: string) => void;
}

export const TabPanelV: React.FC<Props> = ({ selected, items, onSelect }) => {
  const tabs = items.map((item) => {
    const name = item[0].name;
    return <TabButton key={name} name={name} selected={name === selected} onClick={onSelect} />;
  });

  return (
    <div className="w-full h-full">
      <div className="absolute top-0 left-0 w-0 h-0 select-none touch-none">
        <div className="origin-top-left rotate-90 flex gap-1">{tabs}</div>
      </div>
      {items.map((item) =>
        item[0].name === selected || item[0].keepAlive ? (
          <div
            key={item[0].name}
            className={
              "w-full h-full overflow-auto border border-l-gray-500" +
              (item?.[2] ? "" : " p-2") +
              (item[0].name !== selected && item?.[0].keepAlive ? " hidden" : "")
            }
          >
            {item[1]}
          </div>
        ) : undefined,
      )}
    </div>
  );
};

interface TabButtonProps {
  name: string;
  selected?: boolean;
  onClick?: (name: string) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ name, selected, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(name);
  }, [name, onClick]);

  return (
    <button
      type="button"
      className={
        "px-2 rounded-b flex items-center justify-center" +
        (selected ? " bg-gray-500 text-white font-medium" : " bg-white ")
      }
      onClick={handleClick}
    >
      {name}
    </button>
  );
};
