import type { AppCanvasState } from "./core";
import { newAutoPanningState } from "../autoPanningState";
import { getRectCenter, sub } from "okageo";
import { expandRect } from "../../../utils/geometry";

interface Option {
  ids: string[];
  duration?: number;
  scaling?: boolean;
}

export function newPanToShapeState(option: Option): AppCanvasState {
  return {
    getLabel: () => "PanToShape",
    onStart(ctx) {
      if (option.ids.length === 0) return { type: "break" };

      const shapeComposite = ctx.getShapeComposite();
      const shapes = option.ids.map((id) => shapeComposite.mergedShapeMap[id]);
      const rect = shapeComposite.getWrapperRectForShapes(shapes);
      const targetRect = option.scaling ? expandRect(rect, 20) : ctx.getViewRect();
      const diff = sub(getRectCenter(rect), getRectCenter(targetRect));
      return () =>
        newAutoPanningState({
          viewRect: {
            x: targetRect.x + diff.x,
            y: targetRect.y + diff.y,
            width: targetRect.width,
            height: targetRect.height,
          },
          duration: option.duration,
        });
    },
    handleEvent: () => {},
  };
}
