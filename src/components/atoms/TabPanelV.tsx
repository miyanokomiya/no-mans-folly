import { useCallback, useEffect, useMemo, useState } from "react";
import { FloatDialog } from "./FloatDialog";
import { ClickOrDragHandler } from "./ClickOrDragHandler";
import { IVec2 } from "okageo";
import { useGlobalDrag } from "../../hooks/window";
import { createPortal } from "react-dom";

export type TabPanelItem = [{ name: string; keepAlive?: boolean }, React.ReactNode, noPadding?: boolean];

interface Props {
  selected: string;
  items: TabPanelItem[];
  onSelect?: (name: string) => void;
}

export const TabPanelV: React.FC<Props> = ({ selected, items, onSelect }) => {
  const [floating, setFloating] = useState<{ [name: string]: boolean }>({});
  const [dragging, setDragging] = useState<string>();
  const [floatPosition, setFloatPosition] = useState<IVec2>({ x: 100, y: 100 });

  const handleDragEnd = useCallback(() => {
    if (!dragging) return;

    setFloating((v) => {
      const ret = { ...v, [dragging]: true };
      return ret;
    });
    setDragging(undefined);
  }, [dragging]);
  const handleDrag = useCallback((e: PointerEvent) => {
    setFloatPosition({ x: e.pageX, y: e.pageY });
  }, []);
  const { startDragging } = useGlobalDrag(handleDrag, handleDragEnd);
  const handleDragStart = useCallback(
    (name: string, p: IVec2) => {
      setDragging(name);
      setFloatPosition(p);
      startDragging();
    },
    [startDragging],
  );

  const tabs = items
    .filter((item) => !floating[item[0].name] && dragging !== item[0].name)
    .map((item) => {
      const name = item[0].name;
      return (
        <TabButton
          key={name}
          name={name}
          selected={name === selected}
          onClick={onSelect}
          onDragStart={handleDragStart}
        />
      );
    });

  const handleFloatClose = useCallback((name: string) => {
    setFloating((v) => {
      const ret = { ...v };
      delete ret[name];
      return ret;
    });
  }, []);

  useEffect(() => {
    if (floating[selected]) {
      const next = items.find((item) => !floating[item[0].name]);
      if (next) onSelect?.(next[0].name);
    }
  }, [selected, floating, items, onSelect]);

  return (
    <div className="w-full h-full">
      <div className="absolute top-0 left-0 w-0 h-0 select-none touch-none">
        <div className="origin-top-left rotate-90 flex gap-1">{tabs}</div>
      </div>
      {items.map((item) =>
        floating[item[0].name] ? (
          <FloatPanel key={item[0].name} item={item} initialPosition={floatPosition} onClose={handleFloatClose} />
        ) : item[0].name === selected || item[0].keepAlive ? (
          <div
            key={item[0].name}
            className={
              "w-full h-full overflow-auto border border-l-gray-500" +
              (item?.[2] ? "" : " p-2") +
              (item[0].name !== selected && item?.[0].keepAlive ? " hidden" : "")
            }
          >
            {item[1]}
          </div>
        ) : undefined,
      )}
      {dragging && floatPosition
        ? createPortal(
            <div
              className="fixed -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${floatPosition.x}px`, top: `${floatPosition.y}px` }}
            >
              <TabButton name={dragging} />
            </div>,
            document.body,
          )
        : undefined}
    </div>
  );
};

interface TabButtonProps {
  name: string;
  selected?: boolean;
  onClick?: (name: string) => void;
  onDragStart?: (name: string, p: IVec2) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ name, selected, onClick, onDragStart }) => {
  const handleClick = useCallback(() => {
    onClick?.(name);
  }, [name, onClick]);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      onDragStart?.(name, { x: e.pageX, y: e.pageY });
    },
    [name, onDragStart],
  );

  return (
    <ClickOrDragHandler
      className={
        "px-2 rounded-b flex items-center justify-center" +
        (selected ? " bg-gray-500 text-white font-medium" : " bg-white ")
      }
      onClick={handleClick}
      onDragStart={handleDragStart}
    >
      {name}
    </ClickOrDragHandler>
  );
};

const INITIAL_FLOAT_SIZE = { width: 300, height: 400 };

interface FloatPanelProps {
  item: TabPanelItem;
  initialPosition: IVec2;
  onClose?: (name: string) => void;
}

const FloatPanel: React.FC<FloatPanelProps> = ({ item, initialPosition, onClose }) => {
  const handleClose = useCallback(() => {
    onClose?.(item[0].name);
  }, [item, onClose]);

  const centeredP = useMemo(
    () => ({
      x: initialPosition.x - INITIAL_FLOAT_SIZE.width / 2,
      y: initialPosition.y - 14,
    }),
    [initialPosition],
  );

  return (
    <FloatDialog
      key={item[0].name}
      open={true}
      initialPosition={centeredP}
      initialBodySize={INITIAL_FLOAT_SIZE}
      portal
      noBoundsBack
      onClose={handleClose}
    >
      <div className="bg-white h-full p-1 overflow-auto">{item[1]}</div>
    </FloatDialog>
  );
};
