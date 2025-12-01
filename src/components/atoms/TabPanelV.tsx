import { useCallback, useEffect, useMemo, useState } from "react";
import { FloatDialog } from "./FloatDialog";
import { ClickOrDragHandler } from "./ClickOrDragHandler";
import { IVec2 } from "okageo";
import { useGlobalDrag } from "../../hooks/window";
import { createPortal } from "react-dom";
import { useLocalStorageAdopter } from "../../hooks/localStorage";

export type TabPanelItem = [{ name: string; keepAlive?: boolean }, React.ReactNode, noPadding?: boolean];

interface Props {
  name: string;
  selected: string;
  items: TabPanelItem[];
  onSelect?: (name: string) => void;
}

export const TabPanelV: React.FC<Props> = ({ name, selected, items, onSelect }) => {
  const [floating, setFloating] = useLocalStorageAdopter<{ [name: string]: boolean }>({
    key: `${name}-floating`,
    version: "1",
    initialValue: {},
    duration: 0,
  });
  const [dragging, setDragging] = useState<string>();
  const [floatPosition, setFloatPosition] = useState<IVec2>({ x: 100, y: 100 });

  const handleDragEnd = useCallback(() => {
    if (!dragging) return;

    setFloating((v) => {
      const ret = { ...v, [dragging]: true };
      return ret;
    });
    setDragging(undefined);
    // FIXME: There's no better way to clear the stored position.
    localStorage.removeItem(`float-dialog_${dragging}_position`);
  }, [dragging, setFloating]);
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

  const handleFloatClose = useCallback(
    (name: string) => {
      setFloating((v) => {
        const ret = { ...v };
        delete ret[name];
        return ret;
      });
    },
    [setFloating],
  );

  useEffect(() => {
    if (floating[selected] || dragging === selected) {
      const next = items.find((item) => !floating[item[0].name] && dragging !== item[0].name);
      if (next) onSelect?.(next[0].name);
    }
  }, [selected, floating, dragging, items, onSelect]);

  const itemSet = new Map(items.map((item) => [item[0].name, item]));

  const handlePointerEnter = useCallback(
    (name: string) => {
      setFloating((v) => {
        // Rely on JSON key order for the floating dialog order.
        // => It may be a bit unreliable but good enough for this usage.
        const ret = { ...v };
        delete ret[name];
        ret[name] = true;
        return ret;
      });
    },
    [setFloating],
  );

  const selectedItem = itemSet.get(selected);

  return (
    <div className="w-full h-full">
      <div className="absolute top-0 left-0 w-0 h-0 select-none touch-none">
        <div className="origin-top-left rotate-90 flex gap-1">{tabs}</div>
      </div>
      {selectedItem ? (
        <div
          key={selectedItem[0].name}
          className={
            "w-full h-full overflow-auto border border-l-gray-500" +
            (selectedItem?.[2] ? "" : " p-2") +
            (selectedItem[0].name !== selected && selectedItem?.[0].keepAlive ? " hidden" : "")
          }
        >
          {selectedItem[1]}
        </div>
      ) : undefined}
      {Object.entries(floating).map(([key, value], index) => {
        const item = itemSet.get(key);
        if (!value || !item) return;

        return (
          <FloatPanel
            key={item[0].name}
            item={item}
            initialPosition={floatPosition}
            index={index}
            onClose={handleFloatClose}
            onPointerEnter={handlePointerEnter}
          />
        );
      })}
      {dragging && floatPosition
        ? createPortal(
            <div
              className="fixed -translate-x-1/2 -translate-y-1/2 z-110 p-1 rounded bg-gray-500"
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
        "px-2 rounded-b flex items-center justify-center cursor-move" +
        (selected ? " bg-gray-500 text-white font-medium" : " bg-white ")
      }
      threshold={20}
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
  index: number;
  onClose?: (name: string) => void;
  onPointerEnter?: (name: string) => void;
}

const FloatPanel: React.FC<FloatPanelProps> = ({ item, initialPosition, onClose, onPointerEnter, index }) => {
  const handleClose = useCallback(() => {
    onClose?.(item[0].name);
  }, [item, onClose]);

  const handlePointerEnter = useCallback(() => {
    onPointerEnter?.(item[0].name);
  }, [item, onPointerEnter]);

  const centeredP = useMemo(
    () => ({
      x: initialPosition.x - INITIAL_FLOAT_SIZE.width / 2,
      y: initialPosition.y - 16,
    }),
    [initialPosition],
  );

  return (
    <FloatDialog
      key={item[0].name}
      title={item[0].name}
      boundsKey={item[0].name}
      open={true}
      initialPosition={centeredP}
      initialBodySize={INITIAL_FLOAT_SIZE}
      portal
      noBoundsBack
      onClose={handleClose}
      onPointerEnter={handlePointerEnter}
      index={index}
    >
      <div className="bg-white h-full p-1 overflow-auto">{item[1]}</div>
    </FloatDialog>
  );
};
