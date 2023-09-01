import { IRectangle, IVec2, getRectCenter } from "okageo";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../../contexts/AppCanvasContext";
import { getCommonStyle, getWrapperRect, updateCommonStyle } from "../../shapes";
import * as geometry from "../../utils/geometry";
import { CommonStyle, FillStyle, Shape, StrokeStyle } from "../../models";
import { CanvasComposable } from "../../composables/canvas";
import { PopupButton } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import { StrokePanel } from "./StrokePanel";
import { TextItems } from "./TextItems";
import { DocAttrInfo, DocAttributes } from "../../models/document";

interface Option {
  canvas: CanvasComposable;
  currentDocAttrInfo: DocAttrInfo;
}

export const FloatMenu: React.FC<Option> = ({ canvas, currentDocAttrInfo }) => {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [selectedShapes, setSelectedShapes] = useState<Shape[]>([]);
  const [tmpShapeMap, setTmpShapeMap] = useState<{ [id: string]: Partial<Shape> }>({});

  const updateSelectedShapes = useCallback(() => {
    const ctx = smctx.getCtx();
    const shapeMap = ctx.getShapeMap();
    const selected = Object.keys(ctx.getSelectedShapeIdMap());
    setSelectedShapes(selected.map((id) => shapeMap[id]));
    setTmpShapeMap(ctx.getTmpShapeMap());
  }, [smctx]);

  useEffect(() => {
    updateSelectedShapes();
  }, [updateSelectedShapes]);

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      updateSelectedShapes();
    });
  }, [acctx.shapeStore, updateSelectedShapes]);

  useEffect(() => {
    return acctx.shapeStore.watchTmpShapeMap(() => {
      setTmpShapeMap(acctx.shapeStore.getTmpShapeMap());
    });
  }, [acctx.shapeStore]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      updateSelectedShapes();
    });
  }, [acctx.shapeStore, updateSelectedShapes]);

  const indexShape = useMemo<Shape | undefined>(() => {
    const ctx = smctx.getCtx();
    const id = ctx.getLastSelectedShapeId();
    if (!id) return;

    const shape = selectedShapes.find((s) => s.id === id);
    if (!shape) return;

    const tmp = tmpShapeMap[id] ?? {};
    return tmp ? { ...shape, ...tmp } : shape;
  }, [smctx, selectedShapes, tmpShapeMap]);

  const targetRect = useMemo<IRectangle | undefined>(() => {
    if (selectedShapes.length === 0) return;

    const ctx = smctx.getCtx();
    const rect = geometry.getWrapperRect(selectedShapes.map((s) => getWrapperRect(ctx.getShapeStruct, s)));
    const p = canvas.canvasToView(rect);
    const width = rect.width / canvas.scale;
    const height = rect.height / canvas.scale;
    return { x: p.x, y: p.y, width, height };
  }, [canvas, smctx, selectedShapes]);

  const position = useMemo<IVec2 | undefined>(() => {
    if (!targetRect) return;

    const center = getRectCenter(targetRect);
    return { x: center.x, y: targetRect.y + targetRect.height + 10 };
  }, [targetRect]);

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
    const ctx = smctx.getCtx();
    return getCommonStyle(ctx.getShapeStruct, indexShape);
  }, [indexShape, smctx]);

  const onFillChanged = useCallback(
    (fill: FillStyle, draft = false) => {
      const ctx = smctx.getCtx();
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
    [smctx]
  );

  const onStrokeChanged = useCallback(
    (stroke: StrokeStyle, draft = false) => {
      const ctx = smctx.getCtx();
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const shapeMap = ctx.getShapeMap();
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(ctx.getShapeStruct, shapeMap[id], { stroke });
        return p;
      }, {});

      if (draft) {
        ctx.setTmpShapeMap(patch);
      } else {
        ctx.setTmpShapeMap({});
        ctx.patchShapes(patch);
      }
    },
    [smctx]
  );

  const indexDocAttributes = useMemo<DocAttrInfo | undefined>(() => {
    if (!indexShape) return;
    return currentDocAttrInfo;
  }, [indexShape, currentDocAttrInfo]);

  const onDocAttributesChanged = useCallback(
    (attrs: DocAttributes) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs },
      });
    },
    [smctx]
  );

  const onDocBlockAttributesChanged = useCallback(
    (attrs: DocAttributes) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs, block: true },
      });
    },
    [smctx]
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
            popup={<StrokePanel stroke={indexCommonStyle.stroke} onChanged={onStrokeChanged} />}
            onClick={onClickPopupButton}
          >
            <div
              className="w-8 h-8 border rounded-full"
              style={{ backgroundColor: rednerRGBA(indexCommonStyle.stroke.color) }}
            ></div>
          </PopupButton>
        ) : undefined}
        {indexDocAttributes ? (
          <TextItems
            popupedKey={popupedKey}
            setPopupedKey={onClickPopupButton}
            onChanged={onDocAttributesChanged}
            onBlockChanged={onDocBlockAttributesChanged}
            docAttrInfo={currentDocAttrInfo}
          />
        ) : undefined}
      </div>
    </div>
  ) : undefined;
};
