import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppStateContext, AppStateMachineContext } from "../contexts/AppContext";
import { PopupButton } from "./atoms/PopupButton";
import { getWrapperRect } from "../utils/geometry";
import { ListButton, ListLink } from "./atoms/buttons/ListButton";
import { OutsideObserver } from "./atoms/OutsideObserver";
import iconUndo from "../assets/icons/undo.svg";
import iconRedo from "../assets/icons/redo.svg";
import iconHelp from "../assets/icons/help.svg";
import iconPlus from "../assets/icons/plus.svg";
import iconMinus from "../assets/icons/minus.svg";
import { useGlobalMouseupEffect } from "../hooks/window";

export const AppFootbar: React.FC = () => {
  const sm = useContext(AppStateMachineContext);
  const { setZoom, getScale, getShapeComposite, setViewport } = useContext(AppStateContext);
  const [popupedKey, setPopupedKey] = useState("");

  const scale = Math.round((1 / getScale()) * 100);
  const handleZoomOut = useCallback(() => {
    setZoom(getScale() * 1.02, true);
  }, [setZoom, getScale]);
  const handleZoomIn = useCallback(() => {
    setZoom(getScale() / 1.02, true);
  }, [setZoom, getScale]);
  const handleScaleFit = useCallback(() => {
    const shapeComposite = getShapeComposite();
    const rects = shapeComposite.shapes.map((s) => shapeComposite.getWrapperRect(s));
    if (rects.length === 0) return;

    setViewport(getWrapperRect(rects), 80);
  }, [getShapeComposite, setViewport]);
  const handleScale100 = useCallback(() => {
    setZoom(1, true);
  }, [setZoom]);

  const onClickPopupButton = useCallback((value: string) => {
    setPopupedKey((key) => (key === value ? "" : value));
  }, []);
  const handleCloseScalePopup = useCallback(() => {
    setPopupedKey((key) => (key === "scale" ? "" : key));
  }, []);
  const handleCloseHelpPopup = useCallback(() => {
    setPopupedKey((key) => (key === "help" ? "" : key));
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
    <div className="p-1 border rounded bg-white flex gap-2 items-center select-none">
      <div className="flex gap-1 items-center">
        <ZoomButton onZoom={handleZoomOut}>
          <img src={iconMinus} alt="Zoom out" className="w-4 h-4" />
        </ZoomButton>
        <OutsideObserver onClick={handleCloseScalePopup}>
          <PopupButton
            name="scale"
            opened={popupedKey === "scale"}
            popup={
              <div className="flex flex-col items-center">
                <ListButton onClick={handleScaleFit}>Fit</ListButton>
                <ListButton onClick={handleScale100}>100%</ListButton>
              </div>
            }
            onClick={onClickPopupButton}
          >
            <div className="flex items-center justify-center w-12">{scale}%</div>
          </PopupButton>
        </OutsideObserver>
        <ZoomButton onZoom={handleZoomIn}>
          <img src={iconPlus} alt="Zoom In" className="w-4 h-4" />
        </ZoomButton>
      </div>
      <div className="flex gap-1 items-center">
        <button type="button" className="w-8 h-8 border p-1 rounded" onClick={onUndo}>
          <img src={iconUndo} alt="Undo" />
        </button>
        <button type="button" className="w-8 h-8 border p-1 rounded" onClick={onRedo}>
          <img src={iconRedo} alt="Redo" />
        </button>
      </div>
      {process.env.CONTACT_FORM_URL ? (
        <OutsideObserver onClick={handleCloseHelpPopup}>
          <PopupButton
            name="help"
            opened={popupedKey === "help"}
            popup={
              <div className="flex flex-col items-center">
                <ListLink href={process.env.CONTACT_FORM_URL} external>
                  Contact
                </ListLink>
              </div>
            }
            onClick={onClickPopupButton}
            popupPosition="left"
          >
            <div className="w-6 h-6 flex justify-center items-center">
              <img src={iconHelp} alt="Help" />
            </div>
          </PopupButton>
        </OutsideObserver>
      ) : undefined}
    </div>
  );
};

interface ZoomButtonProps {
  children: React.ReactNode;
  onZoom?: () => void;
}

const ZoomButton: React.FC<ZoomButtonProps> = ({ children, onZoom }) => {
  const [down, setDown] = useState(false);

  const handleDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDown(true);
  }, []);

  const handleUp = useCallback(() => {
    setDown(false);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // For long touch
    e.preventDefault();
  }, []);

  const animRef = useRef(0);
  const handleZoomRef = useRef((_delta?: number) => {});
  handleZoomRef.current = (timestamp = 0) => {
    if (timestamp) {
      onZoom?.();
    }
    animRef.current = requestAnimationFrame(handleZoomRef.current);
  };
  useEffect(() => {
    if (!down) return;

    handleZoomRef.current();
    return () => cancelAnimationFrame(animRef.current);
  }, [down]);

  useGlobalMouseupEffect(handleUp);

  return (
    <button
      type="button"
      className="w-8 h-8 rounded border select-none touch-none text-xl flex items-center justify-center"
      onPointerDown={handleDown}
      onContextMenu={handleContextMenu}
    >
      {children}
    </button>
  );
};
