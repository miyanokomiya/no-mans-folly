import { TabPanelV } from "./atoms/TabPanelV";
import { ShapeInspectorPanel } from "./shapeInspectorPanel/ShapeInspectorPanel";
import { ShapeLibraryPanel } from "./ShapeLibraryPanel";
import { SheetConfigPanel } from "./SheetConfigPanel";
import { UserSettingPanel } from "./UserSettingPanel";

interface Props {
  selected: string;
  onSelect?: (name: string) => void;
}

export const AppRightPanel: React.FC<Props> = ({ selected, onSelect }) => {
  const items: [{ name: string }, React.ReactNode][] = [
    [{ name: "Icons" }, <ShapeLibraryPanel />],
    [{ name: "Sheet" }, <SheetConfigPanel />],
    [{ name: "Shape" }, <ShapeInspectorPanel />],
    [{ name: "Settings" }, <UserSettingPanel />],
  ];
  return <TabPanelV selected={selected} onSelect={onSelect} items={items} />;
};
