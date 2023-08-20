import { IVec2, IRectangle } from "okageo";
import type { ModeStateBase, ModeStateContextBase } from "./core";
import type { CommandExam, ContextMenuItem, EditMovement } from "./types";

export interface CanvasStateContext extends ModeStateContextBase {
  generateUuid: () => string;

  setViewport: (rect?: IRectangle) => void;
  panView: (val: EditMovement) => void;
  startDragging: () => void;
  setRectangleDragging: (val?: boolean) => void;
  getDraggedRectangle: () => IRectangle | undefined;

  setContextMenuList: (val?: { items: ContextMenuItem[]; point: IVec2 }) => void;
  setCommandExams: (exams?: CommandExam[]) => void;
}

export type CanvasState = ModeStateBase<CanvasStateContext>;

export function newPanningState(): ModeStateBase<CanvasStateContext, any> {
  return panningState;
}

const panningState: CanvasState = {
  getLabel: () => "Panning",
  shouldRequestPointerLock: true,
  handleEvent: async (ctx, event) => {
    switch (event.type) {
      case "pointermove":
        ctx.panView(event.data);
        return;
      case "pointerup":
        return { type: "break" };
    }
  },
};
