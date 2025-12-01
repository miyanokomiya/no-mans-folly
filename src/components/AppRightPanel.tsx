import { TabPanelItem, TabPanelV } from "./atoms/TabPanelV";
import { FramePanel } from "./framePanel/FramePanel";
import { RealtimePanel } from "./RealtimePanel";
import { ShapeInspectorPanel } from "./shapeInspectorPanel/ShapeInspectorPanel";
import { ShapeLibraryPanel } from "./ShapeLibraryPanel";
import { ShapeTemplatePanel } from "./ShapeTemplatePanel";
import { ShapeTreePanel } from "./shapeTreePanel/ShapeTreePanel";
import { UserSettingPanel } from "./UserSettingPanel";

interface Props {
  selected: string;
  onSelect?: (name: string) => void;
}

export const AppRightPanel: React.FC<Props> = ({ selected, onSelect }) => {
  const items: TabPanelItem[] = [
    [{ name: "Inspector" }, <ShapeInspectorPanel />],
    [{ name: "Tree" }, <ShapeTreePanel />, true],
    [{ name: "Frames" }, <FramePanel />, true],
    [{ name: "Icons", keepAlive: true }, <ShapeLibraryPanel />],
    [{ name: "Templates", keepAlive: true }, <ShapeTemplatePanel />],
    [{ name: "Realtime" }, <RealtimePanel />],
    [{ name: "Settings" }, <UserSettingPanel />],
  ];
  return <TabPanelV name="app-right-panel" selected={selected} onSelect={onSelect} items={items} />;
};
