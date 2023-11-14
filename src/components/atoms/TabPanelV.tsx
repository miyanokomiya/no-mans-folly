import { useCallback } from "react";

interface Props {
  selected: string;
  items: [{ name: string }, React.ReactNode][];
  onSelect?: (name: string) => void;
}

export const TabPanelV: React.FC<Props> = ({ selected, items, onSelect }) => {
  const tabs = items.map((item) => {
    const name = item[0].name;
    return <TabButton key={name} name={name} selected={name === selected} onClick={onSelect} />;
  });
  const panel = items.find((item) => item[0].name === selected)?.[1];

  return (
    <div className="w-full h-full">
      <div className="absolute top-0 left-0 flex flex-col gap-1" style={{ transform: "translateX(calc(-100%))" }}>
        {tabs}
      </div>
      <div className="w-full h-full overflow-auto p-2 border border-l-gray-500">{panel}</div>
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
        "w-6 h-16 rounded-l flex items-center justify-center" +
        (selected ? " bg-gray-500 text-white font-medium" : " bg-white ")
      }
      onClick={handleClick}
    >
      <span className="rotate-90">{name}</span>
    </button>
  );
};