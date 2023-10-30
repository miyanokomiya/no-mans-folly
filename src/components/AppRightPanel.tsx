import { TabPanelV } from "./atoms/TabPanelV";
import { ShapeLibraryPanel } from "./ShapeLibraryPanel";
import { SheetConfigPanel } from "./SheetConfigPanel";

interface Props {
  selected: string;
  onSelect?: (name: string) => void;
}

export const AppRightPanel: React.FC<Props> = ({ selected, onSelect }) => {
  const items: [{ name: string }, React.ReactNode][] = [
    [{ name: "Icons" }, <ShapeLibraryPanel />],
    [{ name: "Sheet" }, <SheetConfigPanel />],
  ];
  return <TabPanelV selected={selected} onSelect={onSelect} items={items} />;
};
