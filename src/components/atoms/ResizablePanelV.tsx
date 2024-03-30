import { useCallback, useRef } from "react";
import { LongPressStarter } from "../atoms/LongPressStarter";
import { clamp } from "okageo";
import { useGlobalDrag } from "../../hooks/window";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

interface Props {
  top: React.ReactNode;
  bottom: React.ReactNode;
  initialRate?: number;
  storageKey?: string;
}

export const ResizablePanelV: React.FC<Props> = ({ top, bottom, initialRate, storageKey }) => {
  const baseRate = initialRate ?? 0.5;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const { state: rate, setState: setRate } = useLocalStorageAdopter({
    key: storageKey,
    version: "1",
    initialValue: baseRate,
  });

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e: PointerEvent) => {
        if (!wrapperRef.current || !dragging.current) return;

        e.preventDefault();
        const rect = wrapperRef.current.getBoundingClientRect();
        const diff = e.movementY / rect.height;
        setRate((r) => clamp(0.1, 0.9, r + diff));
      },
      [setRate],
    ),
    useCallback(() => {
      dragging.current = false;
    }, []),
  );

  const handleDown = useCallback(() => {
    dragging.current = true;
    startDragging();
  }, [startDragging]);

  return (
    <div ref={wrapperRef} className="relative h-full">
      <div className="pb-2" style={{ height: `${rate * 100}%` }}>
        <div className="h-full overflow-auto">{top}</div>
      </div>
      <div className="pt-2" style={{ height: `${(1 - rate) * 100}%` }}>
        <div className="h-full overflow-auto">{bottom}</div>
      </div>
      <LongPressStarter>
        <div
          className="absolute w-full p-2 -translate-y-1/2 cursor-row-resize"
          style={{ top: `${rate * 100}%` }}
          onPointerDown={handleDown}
        >
          <div className="m-auto w-1/2 h-0 border border-gray-400" />
        </div>
      </LongPressStarter>
    </div>
  );
};
