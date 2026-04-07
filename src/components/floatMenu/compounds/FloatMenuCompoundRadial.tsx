import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo } from "react";
import { GetAppStateContext } from "../../../contexts/AppContext";
import { PopupButton, PopupDirection } from "../../atoms/PopupButton";
import { useSelectedTmpShape } from "../../../hooks/storeHooks";
import { CompoundRadial, CompoundRadialShape, isCompoundRadialShape } from "../../../shapes/compoundRadial";
import { RadioSelectInput } from "../../atoms/inputs/RadioSelectInput";
import iconCompoundGrid from "../../../assets/icons/shape_compound_grid.svg";
import iconCompoundRadial from "../../../assets/icons/shape_compound_radial.svg";
import { GridListItem } from "./GridListItem";
import { GridItem, GridValueType } from "../../../shapes/compoundGrid";
import { InspectorLayout } from "../InspectorLayout";

const popupDefaultDirection: PopupDirection = "top";

const radialValueTypeOptions = [
  { value: "1", element: <span className="px-2">Dist</span> },
  { value: "2", element: <span className="px-2">Ratio</span> },
];

const polarValueTypeOptions = [
  { value: "1", element: <span className="px-2">Angle</span> },
  { value: "2", element: <span className="px-2">Ratio</span> },
];

interface Props {
  focusBack?: () => void;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
  popupKey: string;
  onPopupKeyChange: (name: string, option?: { keepFocus?: boolean }) => void;
}

export const FloatMenuCompoundRadial: React.FC<Props> = ({ focusBack, onContextMenu, popupKey, onPopupKeyChange }) => {
  const target = useSelectedTmpShape();
  return target && isCompoundRadialShape(target) ? (
    <FloatMenuCompoundRadialContent
      focusBack={focusBack}
      onContextMenu={onContextMenu}
      target={target}
      popupKey={popupKey}
      onPopupKeyChange={onPopupKeyChange}
    />
  ) : undefined;
};

export const FloatMenuCompoundRadialContent: React.FC<Props & { target: CompoundRadialShape }> = ({
  target,
  focusBack,
  onContextMenu,
  popupKey,
  onPopupKeyChange,
}) => {
  const getCtx = useContext(GetAppStateContext);

  const handleRadialValueTypeChange = useCallback(
    (val: GridValueType) => {
      getCtx().patchShapes({
        [target.id]: {
          radial: {
            ...target.radial,
            type: val,
          },
        } as Partial<CompoundRadialShape>,
      });
    },
    [getCtx, target],
  );

  const handleRadialItemsChange = useCallback(
    (val: GridItem[], draft?: boolean) => {
      const patch = {
        [target.id]: {
          radial: {
            ...target.radial,
            items: val,
          },
        } as Partial<CompoundRadialShape>,
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

  const polarInAngle = useMemo(() => {
    return {
      ...target.polar,
      items: target.polar.items.map((item) => ({
        ...item,
        value: (item.value * 180) / Math.PI,
      })),
    };
  }, [target.polar]);

  const handlePolarValueTypeChange = useCallback(
    (val: GridValueType) => {
      getCtx().patchShapes({
        [target.id]: {
          polar: {
            ...target.polar,
            type: val,
          },
        } as Partial<CompoundRadialShape>,
      });
    },
    [getCtx, target],
  );

  const handlePolarInAngleItemsChange = useCallback(
    (val: GridItem[], draft?: boolean) => {
      const patch = {
        [target.id]: {
          polar: {
            ...target.polar,
            items: val.map((item) => ({ ...item, value: (item.value * Math.PI) / 180 })),
          },
        } as Partial<CompoundRadialShape>,
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
        onPopupKeyChange={onPopupKeyChange}
        onContextMenu={onContextMenu}
        focusBack={focusBack}
      >
        <PopupButton
          name="compound-radial"
          opened={popupKey === "compound-radial"}
          popup={
            <RadialPanel
              items={target.radial}
              valueTypeOptions={radialValueTypeOptions}
              onRadialValueTypeChange={handleRadialValueTypeChange}
              onRadialItemsChange={handleRadialItemsChange}
            />
          }
          onClick={onPopupKeyChange}
          defaultDirection={popupDefaultDirection}
        >
          <div className="w-8 h-8 p-1">
            <img src={iconCompoundGrid} className="" alt="Combound radial" />
          </div>
        </PopupButton>
        <PopupButton
          name="compound-polar"
          opened={popupKey === "compound-polar"}
          popup={
            <RadialPanel
              items={polarInAngle}
              valueTypeOptions={polarValueTypeOptions}
              onRadialValueTypeChange={handlePolarValueTypeChange}
              onRadialItemsChange={handlePolarInAngleItemsChange}
            />
          }
          onClick={onPopupKeyChange}
          defaultDirection={popupDefaultDirection}
        >
          <div className="w-8 h-8 p-1">
            <img src={iconCompoundRadial} className="" alt="Combound polar" />
          </div>
        </PopupButton>
      </InspectorLayout>
    </div>
  );
};

interface RadialPanelProps {
  items: CompoundRadial;
  valueTypeOptions: { value: string; element: React.ReactNode }[];
  onRadialValueTypeChange?: (val: GridValueType) => void;
  onRadialItemsChange?: (val: GridItem[], draft?: boolean) => void;
}

const RadialPanel: React.FC<RadialPanelProps> = ({
  items,
  valueTypeOptions,
  onRadialValueTypeChange,
  onRadialItemsChange,
}) => {
  const handleRadialValueTypeChange = useCallback(
    (rawVal: string) => {
      const val: GridValueType = rawVal === "2" ? 2 : 1;
      onRadialValueTypeChange?.(val);
    },
    [onRadialValueTypeChange],
  );

  const handleRadialItemsChange = useCallback(
    (index: number, val: GridItem, draft?: boolean) => {
      const next = items.items.slice();
      next[index] = val;
      onRadialItemsChange?.(next, draft);
    },
    [items, onRadialItemsChange],
  );

  const handleAdd = useCallback(
    (index: number, val: GridItem) => {
      const next = items.items.slice();
      next.splice(index, 0, val);
      onRadialItemsChange?.(next);
    },
    [items, onRadialItemsChange],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const next = items.items.slice();
      next.splice(index, 1);
      onRadialItemsChange?.(next);
    },
    [items, onRadialItemsChange],
  );

  return (
    <div className="p-1 max-h-80 overflow-auto flex flex-col gap-1">
      <ul className="grid gap-1">
        <li className="flex gap-2">
          <div className="w-26">
            <RadioSelectInput
              value={items.type.toString()}
              options={valueTypeOptions}
              onChange={handleRadialValueTypeChange}
            />
          </div>
          <span className="w-20">Thickness</span>
          <span className="w-16">Labeled</span>
        </li>
        {items.items.map((item, i) => (
          <li key={i}>
            <GridListItem
              index={i}
              item={item}
              onChange={handleRadialItemsChange}
              onAdd={handleAdd}
              onDelete={items.items.length > 1 ? handleDelete : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
