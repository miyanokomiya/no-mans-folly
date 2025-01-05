import * as Y from "yjs";
import { AppUndoManager } from "../contexts/AppCanvasContext";
import { useEffect, useState } from "react";

export function createAppUndoManager(undoManager: Y.UndoManager): AppUndoManager {
  return {
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
    canUndo: () => undoManager.canUndo(),
    canRedo: () => undoManager.canRedo(),
    watch: (fn: () => void) => {
      undoManager.on("stack-item-added", fn);
      return () => {
        undoManager.off("stack-item-added", fn);
      };
    },
    setCaptureTimeout: (timeout = 0) => {
      undoManager.captureTimeout = timeout;
    },
  };
}

export function useCanUndoRedo(appUndoManager: AppUndoManager) {
  const [canUndo, setCanUndo] = useState(appUndoManager.canUndo());
  const [canRedo, setCanRedo] = useState(appUndoManager.canRedo());

  useEffect(() => {
    return appUndoManager.watch(() => {
      setCanUndo(appUndoManager.canUndo());
      setCanRedo(appUndoManager.canRedo());
    });
  }, [appUndoManager]);

  return [canUndo, canRedo];
}
