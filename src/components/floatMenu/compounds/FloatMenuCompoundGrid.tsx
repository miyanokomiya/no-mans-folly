import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo, useState } from "react";
import { GetAppStateContext } from "../../../contexts/AppContext";
import { PopupButton, PopupDirection } from "../../atoms/PopupButton";
import { useSelectedTmpShape } from "../../../hooks/storeHooks";
import {
  CompoundGrid,
  CompoundGridShape,
  GridDirection,
  GridItem,
  GridValueType,
  isCompoundGridShape,
} from "../../../shapes/compoundGrid";
import { RadioSelectInput } from "../../atoms/inputs/RadioSelectInput";
import iconCompoundGrid from "../../../assets/icons/shape_compound_grid.svg";
import iconCompoundGridBi from "../../../assets/icons/shape_compound_grid_bi.svg";
import { InlineField } from "../../atoms/InlineField";
import { GridListItem } from "./GridListItem";
import { InspectorLayout } from "../InspectorLayout";

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
  const [popupKey, setPopupKey] = useState("");

  const handlePopupKeyChange = useCallback(
    (name: string, option?: { keepFocus?: boolean }) => {
      if (popupKey === name) {
        setPopupKey("");
      } else {
        setPopupKey(name);
      }

      if (option?.keepFocus) return;
      focusBack?.();
    },
    [popupKey, focusBack],
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
      <InspectorLayout
        indexShape={target}
        popupKey={popupKey}
        onPopupKeyChange={handlePopupKeyChange}
        onContextMenu={onContextMenu}
        focusBack={focusBack}
      >
        <PopupButton
          name="compound-grid"
          opened={popupKey === "compound-grid"}
          popup={
            <GridPanel
              grid={target.grid}
              onGridValueTypeChange={handleGridValueTypeChange}
              onGridDirectionChange={handleGridDirectionChange}
              onGridItemsChange={handleGridItemsChange}
            />
          }
          onClick={handlePopupKeyChange}
          defaultDirection={popupDefaultDirection}
        >
          <div className="w-8 h-8 p-1">
            {target.grid.direction === 3 ? (
              <img src={iconCompoundGridBi} className="" alt="Combound grid" />
            ) : target.grid.direction === 2 ? (
              <img src={iconCompoundGrid} className="-rotate-90" alt="Combound grid" />
            ) : (
              <img src={iconCompoundGrid} className="" alt="Combound grid" />
            )}
          </div>
        </PopupButton>
      </InspectorLayout>
    </div>
  );
};

interface GridPanelProps {
  grid: CompoundGrid;
  onGridValueTypeChange?: (val: GridValueType) => void;
  onGridDirectionChange?: (val: GridDirection) => void;
  onGridItemsChange?: (val: GridItem[], draft?: boolean) => void;
}

const GridPanel: React.FC<GridPanelProps> = ({
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
      {
        value: "1",
        element: <img src={iconCompoundGrid} className="w-6" alt="Horizontal" />,
      },
      {
        value: "2",
        element: <img src={iconCompoundGrid} className="w-6 -rotate-90" alt="Vertical" />,
      },
      {
        value: "3",
        element: <img src={iconCompoundGridBi} className="w-6" alt="Horizontal and Vertical" />,
      },
    ].map(({ value, element }) => ({
      value,
      element: <div className="w-8 flex justify-center">{element}</div>,
    }));
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
          <span className="w-16">Labeled</span>
        </li>
        {grid.items.map((item, i) => (
          <li key={i}>
            <GridListItem
              index={i}
              item={item}
              onChange={handleGridItemsChange}
              onAdd={handleAdd}
              onDelete={grid.items.length > 1 ? handleDelete : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
