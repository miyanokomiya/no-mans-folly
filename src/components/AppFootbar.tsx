import { useCallback, useContext, useState } from "react";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { PopupButton } from "./atoms/PopupButton";
import { getWrapperRect } from "../utils/geometry";
import { ListButton } from "./atoms/buttons/ListButton";
import { OutsideObserver } from "./atoms/OutsideObserver";
import iconUndo from "../assets/icons/undo.svg";
import iconRedo from "../assets/icons/redo.svg";

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
  const handleScale100 = useCallback(() => {
    smctx.setZoom(1, true);
  }, [smctx]);

  const handleClosePopup = useCallback(() => {
    setPopupedKey("");
  }, []);
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
        <OutsideObserver onClick={handleClosePopup}>
          <PopupButton
            name="scale"
            opened={popupedKey === "scale"}
            popup={
              <div className="flex flex-col items-center">
                <ListButton onClick={handleScaleFit}>Fit</ListButton>
                <ListButton onClick={handleScale100}>100%</ListButton>
              </div>
            }
            onClick={onClickZoomButton}
          >
            <div className="flex items-center">{scale}%</div>
          </PopupButton>
        </OutsideObserver>
        <button type="button" className="w-4 h-8 rounded" onClick={handleScaleUp}>
          +
        </button>
      </div>
      <button type="button" className="w-8 h-8 border p-1 rounded" onClick={onUndo}>
        <img src={iconUndo} alt="Undo" />
      </button>
      <button type="button" className="w-8 h-8 border p-1 rounded" onClick={onRedo}>
        <img src={iconRedo} alt="Redo" />
      </button>
    </div>
  );
};
