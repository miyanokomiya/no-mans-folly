import { ShapeTreePanel } from "../shapeTreePanel/ShapeTreePanel";
import { ShapeInspectorPanel } from "./ShapeInspectorPanel";

export const ShapeTreeInspectorPanel: React.FC = () => {
  return (
    <div className="h-1/2 divide-y divide-solid">
      <div className="h-1/2 overflow-auto p-2">
        <ShapeTreePanel />
      </div>
      <div className="h-1/2 overflow-auto p-2">
        <ShapeInspectorPanel />
      </div>
    </div>
  );
};
