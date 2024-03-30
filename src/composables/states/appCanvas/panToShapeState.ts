import type { AppCanvasState } from "./core";
import { newAutoPanningState } from "../autoPanningState";
import { getRectCenter, sub } from "okageo";

interface Option {
  ids: string[];
  duration?: number;
}

export function newPanToShapeState(option: Option): AppCanvasState {
  return {
    getLabel: () => "PanToShape",
    onStart(ctx) {
      if (option.ids.length === 0) return { type: "break" };

      const shapeComposite = ctx.getShapeComposite();
      const shapes = option.ids.map((id) => shapeComposite.mergedShapeMap[id]);
      const rect = shapeComposite.getWrapperRectForShapes(shapes);
      const viewRect = ctx.getViewRect();
      const diff = sub(getRectCenter(rect), getRectCenter(viewRect));
      return () =>
        newAutoPanningState({
          viewRect: {
            x: viewRect.x + diff.x,
            y: viewRect.y + diff.y,
            width: viewRect.width,
            height: viewRect.height,
          },
          duration: option.duration,
        });
    },
    handleEvent: () => {},
  };
}
