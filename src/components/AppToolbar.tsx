import { useCallback, useContext } from "react";
import { AppStateMachineContext } from "../contexts/AppCanvasContext";
import { createShape, getCommonStruct } from "../shapes";

export const AppToolbar: React.FC = () => {
  const smctx = useContext(AppStateMachineContext);

  const onDownRect = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const shape = createShape(getCommonStruct, "rectangle", { id: smctx.getCtx().generateUuid() });
      smctx.stateMachine.handleEvent({
        type: "state",
        data: {
          name: "DroppingNewShape",
          options: { shape },
        },
      });
    },
    [smctx]
  );

  return (
    <div className="border border-1 p-1 rounded">
      <div className="w-10 h-10 border border-1 p-1 rounded" onMouseDown={onDownRect}>
        Rect
      </div>
      <div className="w-10 h-10 border border-1 p-1 rounded mt-1">Ell</div>
    </div>
  );
};
