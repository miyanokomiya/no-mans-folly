import { IRectangle, IVec2, getRectCenter } from "okageo";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../../contexts/AppCanvasContext";
import { getCommonStyle, getWrapperRect, updateCommonStyle } from "../../shapes";
import * as geometry from "../../utils/geometry";
import { Color, CommonStyle, FillStyle, Shape } from "../../models";
import { ColorPickerPanel } from "../molecules/ColorPickerPanel";
import { CanvasComposable } from "../../composables/canvas";
import { PopupButton } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";

interface Option {
  canvas: CanvasComposable;
}

export const FloatMenu: React.FC<Option> = ({ canvas }) => {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);
  const ctx = smctx.getCtx();

  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);

  const indexShape = useMemo<Shape | undefined>(() => {
    const id = ctx.getLastSelectedShapeId();
    if (!id) return;
    const shape = ctx.getShapeMap()[id] ?? {};
    const tmp = ctx.getTmpShapeMap()[id] ?? {};
    return tmp ? { ...shape, ...tmp } : shape;
  }, [ctx]);

  const targetRect = useMemo<IRectangle | undefined>(() => {
    if (selectedShapes.length === 0) return;

    const rect = geometry.getWrapperRect(selectedShapes.map((s) => getWrapperRect(ctx.getShapeStruct, s)));
    const p = canvas.canvasToView(rect);
    const width = rect.width / canvas.scale;
    const height = rect.height / canvas.scale;
    return { x: p.x, y: p.y, width, height };
  }, [canvas, ctx, selectedShapes]);

  const position = useMemo<IVec2 | undefined>(() => {
    if (!targetRect) return;

    const center = getRectCenter(targetRect);
    return { x: center.x, y: targetRect.y + targetRect.height + 10 };
  }, [targetRect]);

  const updateSelectedShapes = useCallback(() => {
    const shapeMap = ctx.getShapeMap();
    const selected = Object.keys(ctx.getSelectedShapeIdMap());
    setSelectedShapes(selected.map((id) => shapeMap[id]));
  }, [ctx]);

  useEffect(() => {
    updateSelectedShapes();
  }, [updateSelectedShapes]);

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      updateSelectedShapes();
    });
  }, [acctx.shapeStore, updateSelectedShapes]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      updateSelectedShapes();
    });
  }, [acctx.shapeStore, updateSelectedShapes]);

  const [popupedKey, setPopupedKey] = useState("");

  const onClickPopupButton = useCallback(
    (name: string) => {
      if (popupedKey === name) {
        setPopupedKey("");
      } else {
        setPopupedKey(name);
      }
    },
    [popupedKey]
  );

  const indexCommonStyle = useMemo<CommonStyle | undefined>(() => {
    if (!indexShape) return;
    return getCommonStyle(ctx.getShapeStruct, indexShape);
  }, [indexShape, ctx]);

  const onFillChanged = useCallback(
    (fill: FillStyle, draft = false) => {
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const shapeMap = ctx.getShapeMap();
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(ctx.getShapeStruct, shapeMap[id], { fill });
        return p;
      }, {});

      if (draft) {
        ctx.setTmpShapeMap(patch);
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes(patch);
      }
    },
    [ctx]
  );

  const onStrokeChanged = useCallback(
    (color: Color) => {
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const shapeMap = ctx.getShapeMap();
      ctx.patchShapes(
        ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
          p[id] = updateCommonStyle(ctx.getShapeStruct, shapeMap[id], { stroke: { color } });
          return p;
        }, {})
      );
    },
    [ctx]
  );

  return position ? (
    <div
      className="fixed top-0 left-0 border rounded bg-white p-1"
      style={{
        transform: `translate(calc(${position.x}px - 50%), ${position.y}px)`,
      }}
    >
      <div className="flex gap-1">
        {indexCommonStyle?.fill ? (
          <PopupButton
            name="fill"
            opened={popupedKey === "fill"}
            popup={<FillPanel fill={indexCommonStyle.fill} onChanged={onFillChanged} />}
            onClick={onClickPopupButton}
          >
            <div
              className="w-8 h-8 border rounded-full"
              style={{ backgroundColor: rednerRGBA(indexCommonStyle.fill.color) }}
            ></div>
          </PopupButton>
        ) : undefined}
        {indexCommonStyle?.stroke ? (
          <PopupButton
            name="stroke"
            opened={popupedKey === "stroke"}
            popup={<ColorPickerPanel onClick={onStrokeChanged} />}
            onClick={onClickPopupButton}
          >
            <div
              className="w-8 h-8 border rounded-full"
              style={{ backgroundColor: rednerRGBA(indexCommonStyle.stroke.color) }}
            ></div>
          </PopupButton>
        ) : undefined}
      </div>
    </div>
  ) : undefined;
};
