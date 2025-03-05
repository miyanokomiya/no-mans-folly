import { ShapeTreePanel } from "../shapeTreePanel/ShapeTreePanel";
import { ShapeInspectorPanel } from "./ShapeInspectorPanel";
import { ResizablePanelV } from "../atoms/ResizablePanelV";

export const ShapeTreeInspectorPanel: React.FC = () => {
  return (
    <div className="h-full">
      <ResizablePanelV
        top={<ShapeTreePanel />}
        bottom={
          <div className="p-2 pt-0">
            <ShapeInspectorPanel />
          </div>
        }
        storageKey="ShapeTreeInspectorPanel"
      />
    </div>
  );
};
