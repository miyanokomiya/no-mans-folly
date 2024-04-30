import { IVec2, getDistance } from "okageo";
import { useCallback, useRef } from "react";

interface Props {
  onClick?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
  children: React.ReactNode;
  className?: string;
}

export const ClickOrDragHandler: React.FC<Props> = ({ onClick, onDragStart, children, className }) => {
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
        onDragStart?.(e);
        downRef.current = undefined;
      }
    },
    [onDragStart],
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
        onClick?.();
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
