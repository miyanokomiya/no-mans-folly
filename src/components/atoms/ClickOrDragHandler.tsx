import { IVec2, getDistance } from "okageo";
import { useCallback, useRef } from "react";

interface Props {
  onClick?: (e: React.PointerEvent) => void;
  onDragStart?: (e: React.PointerEvent) => void;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export const ClickOrDragHandler: React.FC<Props> = ({ onClick, onDragStart, children, className, threshold = 6 }) => {
  const downRef = useRef<IVec2>(undefined);

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
      if (d > threshold) {
        onDragStart?.(e);
        downRef.current = undefined;
      }
    },
    [onDragStart, threshold],
  );

  // Treat "leave" event as a trigger of dragging.
  // => This helps when there's not enough room to activate dragging on the element.
  const handleLeave = useCallback(
    (e: React.PointerEvent) => {
      if (!downRef.current) return;

      e.preventDefault();
      onDragStart?.(e);
      downRef.current = undefined;
    },
    [onDragStart],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      if (downRef.current) {
        onClick?.(e);
      }
      downRef.current = undefined;
    },
    [onClick],
  );

  return (
    <div
      className={"select-none touch-none " + className}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onPointerUp={handleUp}
    >
      {children}
    </div>
  );
};
