import { useCallback, useContext, useState } from "react";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { PopupButton } from "./atoms/PopupButton";
import { getWrapperRect } from "../utils/geometry";

export const AppFootbar: React.FC = () => {
  const sm = useContext(AppStateMachineContext);
  const smctx = useContext(AppStateContext);
  const [popupedKey, setPopupedKey] = useState("");

  const scale = Math.round(smctx.getScale() * 100);
  const handleScaleDown = useCallback(() => {
    smctx.zoomView(1, true);
  }, [smctx]);
  const handleScaleUp = useCallback(() => {
    smctx.zoomView(-1, true);
  }, [smctx]);
  const handleScaleFit = useCallback(() => {
    const shapeComposite = smctx.getShapeComposite();
    smctx.setViewport(getWrapperRect(shapeComposite.shapes.map((s) => shapeComposite.getWrapperRect(s))), 80);
  }, [smctx]);

  const onClickZoomButton = useCallback(() => {
    setPopupedKey((key) => (key === "scale" ? "" : "scale"));
  }, []);

  const onUndo = useCallback(() => {
    sm.handleEvent({
      type: "history",
      data: "undo",
    });
  }, [sm]);

  const onRedo = useCallback(() => {
    sm.handleEvent({
      type: "history",
      data: "redo",
    });
  }, [sm]);

  return (
    <div className="p-1 border rounded bg-white flex gap-1 items-center">
      <div className="flex">
        <button type="button" className="w-4 h-8 rounded" onClick={handleScaleDown}>
          -
        </button>
        <PopupButton
          name="scale"
          opened={popupedKey === "scale"}
          popup={
            <div className="px-4 flex">
              <button type="button" className="w-full h-8" onClick={handleScaleFit}>
                Fit
              </button>
            </div>
          }
          onClick={onClickZoomButton}
        >
          <div className="flex items-center">{scale}%</div>
        </PopupButton>
        <button type="button" className="w-4 h-8 rounded" onClick={handleScaleUp}>
          +
        </button>
      </div>
      <button type="button" className="w-8 h-8 border p-1 rounded" onClick={onUndo}>
        Un
      </button>
      <button type="button" className="w-8 h-8 border p-1 rounded" onClick={onRedo}>
        Re
      </button>
    </div>
  );
};
