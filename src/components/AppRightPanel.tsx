import { TabPanelItem, TabPanelV } from "./atoms/TabPanelV";
import { FramePanel } from "./framePanel/FramePanel";
import { RealtimePanel } from "./RealtimePanel";
import { ShapeTreeInspectorPanel } from "./shapeInspectorPanel/ShapeTreeInspectorPanel";
import { ShapeLibraryPanel } from "./ShapeLibraryPanel";
import { ShapeTemplatePanel } from "./ShapeTemplatePanel";
import { UserSettingPanel } from "./UserSettingPanel";

interface Props {
  selected: string;
  onSelect?: (name: string) => void;
}

export const AppRightPanel: React.FC<Props> = ({ selected, onSelect }) => {
  const items: TabPanelItem[] = [
    [{ name: "Inspector" }, <ShapeTreeInspectorPanel />, true],
    [{ name: "Frames" }, <FramePanel />, true],
    [{ name: "Icons", keepAlive: true }, <ShapeLibraryPanel />],
    [{ name: "Templates", keepAlive: true }, <ShapeTemplatePanel />],
    [{ name: "Realtime" }, <RealtimePanel />],
    [{ name: "Settings" }, <UserSettingPanel />],
  ];
  return <TabPanelV selected={selected} onSelect={onSelect} items={items} />;
};
