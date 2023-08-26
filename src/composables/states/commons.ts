import { IVec2, IRectangle } from "okageo";
import type { ModeStateBase, ModeStateContextBase, ModeStateEvent, ModeStateEventBase } from "./core";
import type { CommandExam, ContextMenuItem, EditMovement } from "./types";
import { StyleScheme } from "../../models";

export interface CanvasStateContext extends ModeStateContextBase {
  generateUuid: () => string;
  getStyleScheme: () => StyleScheme;

  setViewport: (rect?: IRectangle, margin?: number) => void;
  zoomView: (step: number, center?: boolean) => void;
  getScale: () => number;
  panView: (val: EditMovement) => void;
  startDragging: () => void;
  stopDragging: () => void;

  setContextMenuList: (val?: { items: ContextMenuItem[]; point: IVec2 }) => void;
  setCommandExams: (exams?: CommandExam[]) => void;
  setCursor: (val?: string) => void;

  undo: () => void;
  redo: () => void;
}

export interface HistoryEvent extends ModeStateEventBase {
  type: "history";
  data: "undo" | "redo";
}

export type CanvasStateEvent = ModeStateEvent | HistoryEvent;

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
