import { useCallback, useMemo, useRef, useState } from "react";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "../../composables/window";
import { IVec2, getDistance } from "okageo";

interface Props {
  items: [id: string, element: React.ReactNode][];
  onClick?: (id: string) => void;
  onChange?: (insertion: [from: number, to: number]) => void;
}

export const SortableListV: React.FC<Props> = ({ items, onClick, onChange }) => {
  const [targetId, setTargetId] = useState("");
  const [startP, setStartP] = useState<IVec2 | undefined>();
  const [movingP, setMovingP] = useState<IVec2 | undefined>();
  const [moving, setMoving] = useState(false);
  const [insertion, setInsertion] = useState<[from: number, to: number] | undefined>();
  const containerRed = useRef<HTMLDivElement>(null);

  const onDown = useCallback((e: React.MouseEvent) => {
    const id = e.currentTarget.getAttribute("data-id");
    if (!id) return;

    e.preventDefault();
    setTargetId(id);
    setStartP({ x: e.pageX, y: e.pageY });
  }, []);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!startP || !containerRed.current) return;

      const p = { x: e.pageX, y: e.pageY };
      if (!moving && getDistance(startP, p) < 10) return;

      const rects = Array.from(containerRed.current.children).map((c) => c.getBoundingClientRect());
      const index = rects.findIndex((r) => p.y <= r.y + r.height / 2);

      const adjusted = index === -1 ? items.length : index;
      const fromIndex = items.findIndex((item) => item[0] === targetId);
      setInsertion([fromIndex, adjusted]);

      setMoving(true);
      setMovingP(p);
    },
    [startP, moving, targetId]
  );
  useGlobalMousemoveEffect(onMove);

  const onUp = useCallback(
    (e: MouseEvent) => {
      if (moving && insertion) {
        const [from, to] = insertion;
        if (to !== from || to !== from + 1) {
          onChange?.(insertion);
        }
      } else if (targetId) {
        onClick?.(targetId);
      }

      e.preventDefault();
      setTargetId("");
      setMoving(false);
      setStartP(undefined);
      setInsertion(undefined);
    },
    [moving, targetId, insertion, onChange]
  );
  useGlobalMouseupEffect(onUp);

  const floatItem = useMemo(() => {
    if (!insertion || !movingP) return;

    return (
      <div
        className="fixed opacity-0.5 pointer-events-none"
        style={{
          left: movingP.x,
          top: movingP.y,
          transform: "translate(-30%, -50%)",
        }}
      >
        {items[insertion[0]][1]}
      </div>
    );
  }, [insertion, movingP]);

  const borderElm = <div className="border-4 border-blue-400"></div>;

  return (
    <div ref={containerRed} className="flex flex-col gap-1">
      {items.map((item, i) => (
        <div key={item[0]}>
          {insertion?.[1] === i ? borderElm : undefined}
          <div data-id={item[0]} onMouseDown={onDown}>
            {item[1]}
          </div>
        </div>
      ))}
      {insertion?.[1] === items.length ? borderElm : undefined}
      {floatItem}
    </div>
  );
};
