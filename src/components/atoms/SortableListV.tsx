import { useCallback, useMemo, useRef, useState } from "react";
import { useGlobalDrag } from "../../hooks/window";
import { IVec2, getDistance } from "okageo";
import { LongPressStarter } from "./LongPressStarter";

interface Props {
  items: [id: string, element: React.ReactNode][];
  anchor?: string;
  onClick?: (id: string) => void;
  onChange?: (insertion: [from: number, to: number]) => void;
}

export const SortableListV: React.FC<Props> = ({ items, onClick, onChange, anchor }) => {
  const [targetId, setTargetId] = useState("");
  const [startP, setStartP] = useState<IVec2 | undefined>();
  const [movingP, setMovingP] = useState<IVec2 | undefined>();
  const [moving, setMoving] = useState(false);
  const [insertion, setInsertion] = useState<[from: number, to: number] | undefined>();
  const containerRed = useRef<HTMLDivElement>(null);

  const { startDragging } = useGlobalDrag(
    useCallback(
      (e) => {
        if (!startP || !containerRed.current) return;

        const p = { x: e.pageX, y: e.pageY };
        if (getDistance(startP, p) < 10) return;

        const rects = Array.from(containerRed.current.children).map((c) => c.getBoundingClientRect());
        const index = rects.findIndex((r) => p.y <= r.y + r.height / 2);

        const adjusted = index === -1 ? items.length : index;
        const fromIndex = items.findIndex((item) => item[0] === targetId);
        setInsertion([fromIndex, adjusted]);
        setMovingP(p);
        setMoving(true);
      },
      [targetId, startP, items],
    ),
    useCallback(() => {
      if (moving && insertion) {
        const [from, to] = insertion;
        if (to !== from || to !== from + 1) {
          onChange?.(insertion);
        }
      } else if (targetId) {
        onClick?.(targetId);
      }

      setTargetId("");
      setStartP(undefined);
      setInsertion(undefined);
      setMoving(false);
    }, [moving, targetId, insertion, onClick, onChange]),
  );

  const onDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (anchor && !(e.target as HTMLElement).closest(anchor)) return;
      const id = e.currentTarget.getAttribute("data-id");
      if (!id) return;

      e.preventDefault();
      setTargetId(id);
      setStartP({ x: e.pageX, y: e.pageY });
      startDragging();
    },
    [anchor, startDragging],
  );

  const floatItem = useMemo(() => {
    if (!insertion || !movingP) return;

    return (
      <div
        className="fixed opacity-50 cursor-grabbing"
        style={{
          left: movingP.x,
          top: movingP.y,
          transform: "translate(-30%, -50%)",
        }}
      >
        <div className="pointer-events-none">{items[insertion[0]][1]}</div>
      </div>
    );
  }, [insertion, movingP, items]);

  const borderElm = <div className="border-4 border-blue-400"></div>;

  // FIXME: On touch environment, dragging works only when "pointermove" takes place immediately after "pointerdown".
  // => Touching for a while in place then moving doesn't work. Presumably something related touch events interrupts it.
  return (
    <div ref={containerRed} className="flex flex-col gap-1">
      {items.map((item, i) => (
        <div key={item[0]}>
          {insertion?.[1] === i ? borderElm : undefined}
          <LongPressStarter data-id={item[0]} onPointerDown={onDown}>
            {item[1]}
          </LongPressStarter>
        </div>
      ))}
      {insertion?.[1] === items.length ? borderElm : undefined}
      {floatItem}
    </div>
  );
};
