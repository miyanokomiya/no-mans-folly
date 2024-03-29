import { TabPanelV } from "./atoms/TabPanelV";
import { ShapeTreeInspectorPanel } from "./shapeInspectorPanel/ShapeTreeInspectorPanel";
import { ShapeLibraryPanel } from "./ShapeLibraryPanel";
import { ShapeTemplatePanel } from "./ShapeTemplatePanel";
import { SheetConfigPanel } from "./SheetConfigPanel";
import { UserSettingPanel } from "./UserSettingPanel";

interface Props {
  selected: string;
  onSelect?: (name: string) => void;
}

export const AppRightPanel: React.FC<Props> = ({ selected, onSelect }) => {
  const items: [{ name: string }, React.ReactNode, noPadding?: boolean][] = [
    [{ name: "Inspector" }, <ShapeTreeInspectorPanel />, true],
    [{ name: "Sheet" }, <SheetConfigPanel />],
    [{ name: "Icons" }, <ShapeLibraryPanel />],
    [{ name: "Templates" }, <ShapeTemplatePanel />],
    [{ name: "Settings" }, <UserSettingPanel />],
  ];
  return <TabPanelV selected={selected} onSelect={onSelect} items={items} />;
};
