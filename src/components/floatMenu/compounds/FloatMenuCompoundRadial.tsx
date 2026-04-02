import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo, useState } from "react";
import { GetAppStateContext } from "../../../contexts/AppContext";
import { FillStyle } from "../../../models";
import { PopupButton, PopupDirection } from "../../atoms/PopupButton";
import { rednerRGBA } from "../../../utils/color";
import { FillPanel } from "./../FillPanel";
import menuIcon from "../../../assets/icons/three_dots_v.svg";
import { useSelectedTmpShape } from "../../../hooks/storeHooks";
import { StrokePanel } from "./../StrokePanel";
import { CompoundRadial, CompoundRadialShape, isCompoundRadialShape } from "../../../shapes/compoundRadial";
import { RadioSelectInput } from "../../atoms/inputs/RadioSelectInput";
import iconCompoundRadial from "../../../assets/icons/shape_compound_grid.svg";
import { GridListItem } from "./GridListItem";
import { GridItem, GridValueType } from "../../../shapes/compoundGrid";

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
}

export const FloatMenuCompoundRadial: React.FC<Props> = ({ focusBack, onContextMenu }) => {
  const target = useSelectedTmpShape();
  return target && isCompoundRadialShape(target) ? (
    <FloatMenuCompoundRadialContent focusBack={focusBack} onContextMenu={onContextMenu} target={target} />
  ) : undefined;
};

export const FloatMenuCompoundRadialContent: React.FC<Props & { target: CompoundRadialShape }> = ({
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
      const patch: Partial<CompoundRadialShape> = {
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
      const patch: Partial<CompoundRadialShape> = {
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
        name="compound-radial"
        opened={popupedKey === "compound-radial"}
        popup={
          <RadialPanel
            items={target.radial}
            valueTypeOptions={radialValueTypeOptions}
            onRadialValueTypeChange={handleRadialValueTypeChange}
            onRadialItemsChange={handleRadialItemsChange}
          />
        }
        onClick={onClickPopupButton}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={iconCompoundRadial} className="" alt="Combound radial" />
        </div>
      </PopupButton>
      <PopupButton
        name="compound-polar"
        opened={popupedKey === "compound-polar"}
        popup={
          <RadialPanel
            items={polarInAngle}
            valueTypeOptions={polarValueTypeOptions}
            onRadialValueTypeChange={handlePolarValueTypeChange}
            onRadialItemsChange={handlePolarInAngleItemsChange}
          />
        }
        onClick={onClickPopupButton}
        defaultDirection={popupDefaultDirection}
      >
        <div className="w-8 h-8 p-1">
          <img src={iconCompoundRadial} className="" alt="Combound radial" />
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
