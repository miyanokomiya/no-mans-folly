import { IVec2, IRectangle } from "okageo";
import type { ModeStateBase, ModeStateContextBase, ModeStateEvent } from "./core";
import type { CommandExam, ContextMenuItem, EditMovement } from "./types";

export interface CanvasStateContext extends ModeStateContextBase {
  generateUuid: () => string;

  setViewport: (rect?: IRectangle, margin?: number) => void;
  zoomView: (step: number, center?: boolean) => void;
  panView: (val: EditMovement) => void;
  startDragging: () => void;
  stopDragging: () => void;

  setContextMenuList: (val?: { items: ContextMenuItem[]; point: IVec2 }) => void;
  setCommandExams: (exams?: CommandExam[]) => void;
}

export type CanvasStateEvent = ModeStateEvent;

export type CanvasState = ModeStateBase<CanvasStateContext, CanvasStateEvent>;

export function newPanningState(): CanvasState {
  return panningState;
}

const panningState: CanvasState = {
  getLabel: () => "Panning",
  onStart: async (ctx) => {
    ctx.startDragging();
  },
  onEnd: async (ctx) => {
    ctx.stopDragging();
  },
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
