import { useCallback } from "react";

interface Props {
  selected: string;
  items: [{ name: string }, React.ReactNode, noPadding?: boolean][];
  onSelect?: (name: string) => void;
}

export const TabPanelV: React.FC<Props> = ({ selected, items, onSelect }) => {
  const tabs = items.map((item) => {
    const name = item[0].name;
    return <TabButton key={name} name={name} selected={name === selected} onClick={onSelect} />;
  });
  const item = items.find((item) => item[0].name === selected);
  if (!item) return undefined;

  const panel = item[1];
  const wrapperClassName = item[2] ? "" : " p-2";

  return (
    <div className="w-full h-full">
      <div className="absolute top-0 left-0 select-none touch-none">
        <div className="origin-top-left rotate-90 flex gap-1">{tabs}</div>
      </div>
      <div className={"w-full h-full overflow-auto border border-l-gray-500" + wrapperClassName}>{panel}</div>
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
        "px-2 rounded-l flex items-center justify-center" +
        (selected ? " bg-gray-500 text-white font-medium" : " bg-white ")
      }
      onClick={handleClick}
    >
      {name}
    </button>
  );
};
