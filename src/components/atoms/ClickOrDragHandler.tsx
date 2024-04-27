import { IVec2, getDistance } from "okageo";
import { useCallback, useRef } from "react";

interface Props {
  onClick?: () => void;
  onDragStart?: () => void;
  children: React.ReactNode;
}

export const ClickOrDragHandler: React.FC<Props> = ({ onClick, onDragStart, children }) => {
  const downRef = useRef<IVec2>();

  const handleDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    downRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (!downRef.current) return;

      e.preventDefault();
      const p = { x: e.clientX, y: e.clientY };
      const d = getDistance(p, downRef.current);
      if (d > 6) {
        onDragStart?.();
        downRef.current = undefined;
      }
    },
    [onDragStart],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (downRef.current) {
        onClick?.();
      }
      downRef.current = undefined;
    },
    [onClick],
  );

  return (
    <div
      className="select-none touch-none"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
    >
      {children}
    </div>
  );
};
