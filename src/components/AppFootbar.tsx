import { useCallback, useContext } from "react";
import { AppStateMachineContext } from "../contexts/AppCanvasContext";

export const AppFootbar: React.FC = () => {
  const smctx = useContext(AppStateMachineContext);

  const onUndo = useCallback(() => {
    smctx.stateMachine.handleEvent({
      type: "history",
      data: "undo",
    });
  }, [smctx.stateMachine]);

  const onRedo = useCallback(() => {
    smctx.stateMachine.handleEvent({
      type: "history",
      data: "redo",
    });
  }, [smctx.stateMachine]);

  return (
    <div className="p-1 border rounded">
      <button type="button" className="w-8 h-8 border p-1 rounded mr-1" onClick={onUndo}>
        Un
      </button>
      <button type="button" className="w-8 h-8 border p-1 rounded" onClick={onRedo}>
        Re
      </button>
    </div>
  );
};
