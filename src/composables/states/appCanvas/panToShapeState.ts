import type { AppCanvasState } from "./core";
import { newAutoPanningState } from "../autoPanningState";

interface Option {
  ids: string[];
  duration?: number;
}

export function newPanToShapeState(option: Option): AppCanvasState {
  return {
    getLabel: () => "PanToShape",
    onStart(ctx) {
      if (option.ids.length === 0) return;

      const shapeComposite = ctx.getShapeComposite();
      const shapes = option.ids.map((id) => shapeComposite.mergedShapeMap[id]);
      const rect = shapeComposite.getWrapperRectForShapes(shapes);

      return () => newAutoPanningState({ viewRect: rect, duration: option.duration });
    },
    handleEvent: () => {},
  };
}
