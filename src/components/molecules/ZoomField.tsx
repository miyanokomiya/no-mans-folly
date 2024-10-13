import { useCallback, useEffect, useRef, useState } from "react";
import { OutsideObserver } from "../atoms/OutsideObserver";
import { ListButton } from "../atoms/buttons/ListButton";
import { PopupButton } from "../atoms/PopupButton";
import iconPlus from "../../assets/icons/plus.svg";
import iconMinus from "../../assets/icons/minus.svg";
import { useGlobalMouseupEffect } from "../../hooks/window";

interface Props {
  scale: number;
  onScaleChange: (scale: number, center?: boolean) => void;
  onScaleFit?: () => void;
  popupedKey: string;
  onClickPopupButton: (key: string) => void;
}

export const ZoomField: React.FC<Props> = ({ scale, onScaleChange, onScaleFit, popupedKey, onClickPopupButton }) => {
  const viewScalePercent = Math.round((1 / scale) * 100);

  const handleCloseScalePopup = useCallback(() => {
    if (popupedKey !== "scale") return;
    onClickPopupButton("");
  }, [popupedKey, onClickPopupButton]);

  const handleZoomOut = useCallback(() => {
    onScaleChange(scale * 1.02, true);
  }, [onScaleChange, scale]);
  const handleZoomIn = useCallback(() => {
    onScaleChange(scale / 1.02, true);
  }, [onScaleChange, scale]);
  const handleScale100 = useCallback(() => {
    onScaleChange(1, true);
    handleCloseScalePopup();
  }, [onScaleChange, handleCloseScalePopup]);

  return (
    <div className="flex gap-1 items-center select-none">
      <ZoomButton onZoom={handleZoomOut}>
        <img src={iconMinus} alt="Zoom out" className="w-6 h-6" />
      </ZoomButton>
      <OutsideObserver onClick={handleCloseScalePopup}>
        <PopupButton
          name="scale"
          opened={popupedKey === "scale"}
          popup={
            <div className="flex flex-col items-center">
              {onScaleFit ? <ListButton onClick={onScaleFit}>Fit</ListButton> : undefined}
              <ListButton onClick={handleScale100}>100%</ListButton>
            </div>
          }
          onClick={onClickPopupButton}
          defaultDirection="top"
        >
          <div className="flex items-center justify-center w-12">{viewScalePercent}%</div>
        </PopupButton>
      </OutsideObserver>
      <ZoomButton onZoom={handleZoomIn}>
        <img src={iconPlus} alt="Zoom In" className="w-6 h-6" />
      </ZoomButton>
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
      className="bg-white w-8 h-8 rounded border select-none touch-none text-xl flex items-center justify-center"
      onPointerDown={handleDown}
      onContextMenu={handleContextMenu}
    >
      {children}
    </button>
  );
};
