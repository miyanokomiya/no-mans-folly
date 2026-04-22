import { useCallback, useContext, useMemo } from "react";
import { CommonStyle, FillStyle, Shape, StrokeStyle } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { StackButton } from "./StackButton";
import {
  getCommonStyle,
  patchShapesOrderToFirst,
  patchShapesOrderToLast,
  stackOrderDisabled,
  updateCommonStyle,
} from "../../shapes";
import { GetAppStateContext } from "../../contexts/AppContext";
import { FillPanel } from "./FillPanel";
import { StrokePanel } from "./StrokePanel";
import { rednerRGBA, resolveColor } from "../../utils/color";
import { useColorPalette } from "../../hooks/storeHooks";
import { useShapeComposite } from "../../hooks/storeHooks";
import { getPatchByLayouts } from "../../composables/shapeLayoutHandler";
import { IVec2 } from "okageo";
import menuIcon from "../../assets/icons/three_dots_v.svg";

const popupDefaultDirection: PopupDirection = "top";

interface Props {
  indexShape: Shape;
  popupKey: string;
  onPopupKeyChange: (name: string) => void;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
  focusBack?: () => void;
  children?: React.ReactNode;
}

export const InspectorLayout: React.FC<Props> = ({
  popupKey,
  onPopupKeyChange,
  indexShape,
  focusBack,
  onContextMenu,
  children,
}) => {
  const getCtx = useContext(GetAppStateContext);
  const palette = useColorPalette();
  const shapeComposite = useShapeComposite();

  const indexCommonStyle = useMemo<CommonStyle | undefined>(() => {
    return getCommonStyle(shapeComposite.getShapeStruct, indexShape);
  }, [indexShape, shapeComposite]);

  const onFillChanged = useCallback(
    (val: Partial<FillStyle>, draft = false) => {
      const ctx = getCtx();
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const sc = ctx.getShapeComposite();
      const shapeMap = sc.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(sc.getShapeStruct, shapeMap[id], { fill: val });
        return p;
      }, {});

      if (draft) {
        ctx.setTmpShapeMap(patch);
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes(patch);
        focusBack?.();
      }
    },
    [getCtx, focusBack],
  );

  const onStrokeChanged = useCallback(
    (val: Partial<StrokeStyle>, draft = false) => {
      const ctx = getCtx();
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const sc = ctx.getShapeComposite();
      const shapeMap = sc.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(sc.getShapeStruct, shapeMap[id], { stroke: val });
        return p;
      }, {});

      if (draft) {
        ctx.setTmpShapeMap(patch);
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes(patch);
        focusBack?.();
      }
    },
    [getCtx, focusBack],
  );

  const canChangeStack = useMemo<boolean>(() => {
    return !!indexShape && !stackOrderDisabled(shapeComposite.getShapeStruct, indexShape);
  }, [indexShape, shapeComposite]);

  const onClickStackLast = useCallback(() => {
    const ctx = getCtx();
    const sc = ctx.getShapeComposite();
    const shapeMap = sc.shapeMap;
    const selectedShapes = Object.keys(ctx.getSelectedShapeIdMap()).map((id) => shapeMap[id]);
    const ids = selectedShapes.filter((s) => !stackOrderDisabled(sc.getShapeStruct, s)).map((s) => s.id);
    const layoutPatch = getPatchByLayouts(sc, {
      update: patchShapesOrderToLast(ids, ctx.createLastIndex()),
    });
    ctx.patchShapes(layoutPatch);
    focusBack?.();
  }, [getCtx, focusBack]);

  const onClickStackFirst = useCallback(() => {
    const ctx = getCtx();
    const sc = ctx.getShapeComposite();
    const shapeMap = sc.shapeMap;
    const selectedShapes = Object.keys(ctx.getSelectedShapeIdMap()).map((id) => shapeMap[id]);
    const ids = selectedShapes.filter((s) => !stackOrderDisabled(sc.getShapeStruct, s)).map((s) => s.id);
    const layoutPatch = getPatchByLayouts(sc, {
      update: patchShapesOrderToFirst(ids, ctx.createFirstIndex()),
    });
    ctx.patchShapes(layoutPatch);
    focusBack?.();
  }, [getCtx, focusBack]);

  const handleContextMenuClick = useCallback(
    (e: React.MouseEvent) => {
      const bounds = (e.target as HTMLElement).getBoundingClientRect();
      onContextMenu({ x: (bounds.left + bounds.right) / 2, y: bounds.bottom }, true);
    },
    [onContextMenu],
  );

  return (
    <>
      {indexCommonStyle?.fill ? (
        <PopupButton
          name="fill"
          opened={popupKey === "fill"}
          popup={<FillPanel fill={indexCommonStyle.fill} onChanged={onFillChanged} />}
          onClick={onPopupKeyChange}
          defaultDirection={popupDefaultDirection}
        >
          <div
            className="w-8 h-8 border-2 rounded-full"
            style={{ backgroundColor: rednerRGBA(resolveColor(indexCommonStyle.fill.color, palette)) }}
          ></div>
        </PopupButton>
      ) : undefined}
      {indexCommonStyle?.stroke ? (
        <PopupButton
          name="stroke"
          opened={popupKey === "stroke"}
          popup={<StrokePanel stroke={indexCommonStyle.stroke} onChanged={onStrokeChanged} />}
          onClick={onPopupKeyChange}
          defaultDirection={popupDefaultDirection}
        >
          <div className="w-8 h-8 flex justify-center items-center">
            <div
              className="w-1.5 h-9 border rounded-xs rotate-45"
              style={{ backgroundColor: rednerRGBA(resolveColor(indexCommonStyle.stroke.color, palette)) }}
            ></div>
          </div>
        </PopupButton>
      ) : undefined}
      {children}
      {canChangeStack ? (
        <StackButton
          popupKey={popupKey}
          setPopupKey={onPopupKeyChange}
          defaultDirection={popupDefaultDirection}
          onClickLast={onClickStackLast}
          onClickFirst={onClickStackFirst}
        />
      ) : undefined}
      <button
        type="button"
        className="w-10.5 h-10.5 border rounded-xs bg-white flex justify-center items-center"
        onClick={handleContextMenuClick}
      >
        <img src={menuIcon} alt="Context menu" className="w-6 h-6" />
      </button>
    </>
  );
};
