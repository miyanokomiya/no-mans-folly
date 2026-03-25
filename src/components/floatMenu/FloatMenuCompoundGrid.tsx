import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo, useState } from "react";
import { GetAppStateContext } from "../../contexts/AppContext";
import { FillStyle } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import menuIcon from "../../assets/icons/three_dots_v.svg";
import { useSelectedTmpShape } from "../../hooks/storeHooks";
import { StrokePanel } from "./StrokePanel";
import {
  CompoundGrid,
  CompoundGridShape,
  GridDirection,
  GridItem,
  GridValueType,
  isCompoundGridShape,
} from "../../shapes/compoundGrid";
import { RadioSelectInput } from "../atoms/inputs/RadioSelectInput";
import iconDustbinRed from "../../assets/icons/dustbin_red.svg";
import iconAdd from "../../assets/icons/add_filled.svg";
import { NumberInput } from "../atoms/inputs/NumberInput";
import { SliderInput } from "../atoms/inputs/SliderInput";
import { IconButton } from "../atoms/buttons/IconButton";
import { InlineField } from "../atoms/InlineField";

const popupDefaultDirection: PopupDirection = "top";

function getGridValueTypeLabel(val: GridValueType) {
  return val === 2 ? "Ratio" : "Dist";
}

interface Props {
  focusBack?: () => void;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
}

export const FloatMenuCompoundGrid: React.FC<Props> = ({ focusBack, onContextMenu }) => {
  const target = useSelectedTmpShape();
  return target && isCompoundGridShape(target) ? (
    <FloatMenuCompoundGridContent focusBack={focusBack} onContextMenu={onContextMenu} target={target} />
  ) : undefined;
};

export const FloatMenuCompoundGridContent: React.FC<Props & { target: CompoundGridShape }> = ({
  target,
  focusBack,
  onContextMenu,
}) => {
  const getCtx = useContext(GetAppStateContext);
  const [popupedKey, setPopupedKey] = useState("");

  const onClickPopupButton = useCallback(
    (name: string, option?: { keepFocus?: boolean }) => {
      if (popupedKey === name) {
        setPopupedKey("");
      } else {
        setPopupedKey(name);
      }

      if (option?.keepFocus) return;
      focusBack?.();
    },
    [popupedKey, focusBack],
  );

  const onFillChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      const ctx = getCtx();
      const patch: Partial<CompoundGridShape> = {
        fill: { ...target.fill, ...val },
      };

      if (draft) {
        ctx.setTmpShapeMap({ [target.id]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes({ [target.id]: patch });
        focusBack?.();
      }
    },
    [focusBack, getCtx, target],
  );

  const onStrokeChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      const ctx = getCtx();
      const patch: Partial<CompoundGridShape> = {
        stroke: { ...target.stroke, ...val },
      };

      if (draft) {
        ctx.setTmpShapeMap({ [target.id]: patch });
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes({ [target.id]: patch });
        focusBack?.();
      }
    },
    [focusBack, getCtx, target],
  );

  const handleContextMenuClick = useCallback(
    (e: React.MouseEvent) => {
      const bounds = (e.target as HTMLElement).getBoundingClientRect();
      onContextMenu({ x: (bounds.left + bounds.right) / 2, y: bounds.bottom }, true);
    },
    [onContextMenu],
  );

  const handleGridValueTypeChange = useCallback(
    (val: GridValueType) => {
      getCtx().patchShapes({
        [target.id]: {
          grid: {
            ...target.grid,
            type: val,
          },
        } as Partial<CompoundGridShape>,
      });
    },
    [getCtx, target],
  );

  const handleGridDirectionChange = useCallback(
    (val: GridDirection) => {
      getCtx().patchShapes({
        [target.id]: {
          grid: {
            ...target.grid,
            direction: val,
          },
        } as Partial<CompoundGridShape>,
      });
    },
    [getCtx, target],
  );

  const handleGridItemsChange = useCallback(
    (val: GridItem[], draft?: boolean) => {
      const patch = {
        [target.id]: {
          grid: {
            ...target.grid,
            items: val,
          },
        } as Partial<CompoundGridShape>,
      };

      if (draft) {
        getCtx().setTmpShapeMap(patch);
      } else {
        getCtx().setTmpShapeMap({});
        getCtx().patchShapes(patch);
      }
    },
    [getCtx, target],
  );

  return (
    <div className="flex gap-1 items-center">
      <PopupButton
        name="fill"
        opened={popupedKey === "fill"}
        popup={<FillPanel fill={target.fill} onChanged={onFillChanged} />}
        onClick={onClickPopupButton}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 border-2 rounded-full" style={{ backgroundColor: rednerRGBA(target.fill.color) }}></div>
      </PopupButton>
      <PopupButton
        name="stroke"
        opened={popupedKey === "stroke"}
        popup={<StrokePanel stroke={target.stroke} onChanged={onStrokeChanged} />}
        onClick={onClickPopupButton}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 flex justify-center items-center">
          <div
            className="w-1.5 h-9 border rounded-xs rotate-45"
            style={{ backgroundColor: rednerRGBA(target.stroke.color) }}
          ></div>
        </div>
      </PopupButton>
      <div className="h-8 mx-0.5 border"></div>
      <PopupButton
        name="compound-grid"
        opened={popupedKey === "compound-grid"}
        popup={
          <GridPanel
            grid={target.grid}
            onGridValueTypeChange={handleGridValueTypeChange}
            onGridDirectionChange={handleGridDirectionChange}
            onGridItemsChange={handleGridItemsChange}
          />
        }
        onClick={onClickPopupButton}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 flex justify-center items-center">
          <div
            className="w-1.5 h-9 border rounded-xs rotate-45"
            style={{ backgroundColor: rednerRGBA(target.stroke.color) }}
          ></div>
        </div>
      </PopupButton>
      <div className="h-8 mx-0.5 border"></div>
      <button
        type="button"
        className="w-10.5 h-10.5 border rounded-xs bg-white flex justify-center items-center"
        onClick={handleContextMenuClick}
      >
        <img src={menuIcon} alt="Context menu" className="w-6 h-6" />
      </button>
    </div>
  );
};

interface GridPanelProps {
  grid: CompoundGrid;
  onGridValueTypeChange?: (val: GridValueType) => void;
  onGridDirectionChange?: (val: GridDirection) => void;
  onGridItemsChange?: (val: GridItem[], draft?: boolean) => void;
}

export const GridPanel: React.FC<GridPanelProps> = ({
  grid,
  onGridValueTypeChange,
  onGridDirectionChange,
  onGridItemsChange,
}) => {
  const gridValueTypeOptions = useMemo(() => {
    return [
      { value: "1", element: <span className="px-2">{getGridValueTypeLabel(1)}</span> },
      { value: "2", element: <span className="px-2">{getGridValueTypeLabel(2)}</span> },
    ];
  }, []);

  const handleGridValueTypeChange = useCallback(
    (rawVal: string) => {
      const val: GridValueType = rawVal === "2" ? 2 : 1;
      onGridValueTypeChange?.(val);
    },
    [onGridValueTypeChange],
  );

  const gridDirectionTypeOptions = useMemo(() => {
    return [
      { value: "1", element: <img src={iconAdd} className="w-6" alt="Horizontal" /> },
      { value: "2", element: <img src={iconAdd} className="w-6" alt="Vertical" /> },
      { value: "3", element: <img src={iconAdd} className="w-6" alt="Horizontal and Vertical" /> },
    ];
  }, []);

  const handleGridDirectionChange = useCallback(
    (rawVal: string) => {
      const val: GridDirection = rawVal === "3" ? 3 : rawVal === "2" ? 2 : 1;
      onGridDirectionChange?.(val);
    },
    [onGridDirectionChange],
  );

  const handleGridItemsChange = useCallback(
    (index: number, val: GridItem, draft?: boolean) => {
      const next = grid.items.slice();
      next[index] = val;
      onGridItemsChange?.(next, draft);
    },
    [grid, onGridItemsChange],
  );

  const handleAdd = useCallback(
    (index: number, val: GridItem) => {
      const next = grid.items.slice();
      next.splice(index, 0, val);
      onGridItemsChange?.(next);
    },
    [grid, onGridItemsChange],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const next = grid.items.slice();
      next.splice(index, 1);
      onGridItemsChange?.(next);
    },
    [grid, onGridItemsChange],
  );

  return (
    <div className="p-1 max-h-80 overflow-auto flex flex-col gap-1">
      <InlineField label="Direction">
        <RadioSelectInput
          value={grid.direction.toString()}
          options={gridDirectionTypeOptions}
          onChange={handleGridDirectionChange}
        />
      </InlineField>
      <div className="border" />
      <ul className="grid gap-1">
        <li className="flex gap-2">
          <div className="w-26">
            <RadioSelectInput
              value={grid.type.toString()}
              options={gridValueTypeOptions}
              onChange={handleGridValueTypeChange}
            />
          </div>
          <span className="w-20">Thickness</span>
        </li>
        {grid.items.map((item, i) => (
          <li key={i}>
            <GridListItem
              index={i}
              item={item}
              onChange={handleGridItemsChange}
              onAdd={handleAdd}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

interface GridItemProps {
  index: number;
  item: GridItem;
  onChange?: (index: number, val: GridItem, draft?: boolean) => void;
  onAdd?: (index: number, val: GridItem) => void;
  onDelete?: (index: number) => void;
}

const GridListItem: React.FC<GridItemProps> = ({ index, item, onChange, onAdd, onDelete }) => {
  const handleValueChange = useCallback(
    (value: number, draft = false) => {
      onChange?.(index, { ...item, value }, draft);
    },
    [index, item, onChange],
  );

  const handleScaleChange = useCallback(
    (scale: number, draft = false) => {
      onChange?.(index, { ...item, scale: scale }, draft);
    },
    [index, item, onChange],
  );

  const handleAdd = useCallback(() => {
    onAdd?.(index, item);
  }, [index, item, onAdd]);

  const handleDelete = useCallback(() => {
    onDelete?.(index);
  }, [index, onDelete]);

  return (
    <div className="flex items-center gap-2">
      <div className="w-26">
        <NumberInput min={0} value={item.value} onChange={handleValueChange} slider />
      </div>
      <div className="w-20">
        <SliderInput min={0} max={1} step={0.1} value={item.scale ?? 1} onChanged={handleScaleChange} showValue />
      </div>
      <IconButton icon={iconAdd} size={8} alt="Add" onClick={handleAdd} />
      <IconButton icon={iconDustbinRed} size={8} alt="Delete" onClick={handleDelete} />
    </div>
  );
};
