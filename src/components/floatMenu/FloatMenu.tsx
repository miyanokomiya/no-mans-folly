import { IRectangle, IVec2, getRectCenter } from "okageo";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../../contexts/AppCanvasContext";
import { getCommonStyle, getWrapperRect, updateCommonStyle } from "../../shapes";
import * as geometry from "../../utils/geometry";
import { CommonStyle, FillStyle, LineHead, Shape, Size, StrokeStyle } from "../../models";
import { canvasToView } from "../../composables/canvas";
import { PopupButton } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import { StrokePanel } from "./StrokePanel";
import { TextItems } from "./TextItems";
import { DocAttrInfo, DocAttributes } from "../../models/document";
import { useWindow } from "../../composables/window";
import { LineHeadItems } from "./LineHeadItems";
import { LineShape } from "../../shapes/line";

interface Option {
  scale: number;
  viewOrigin: IVec2;
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
}

export const FloatMenu: React.FC<Option> = ({ scale, viewOrigin, indexDocAttrInfo, focusBack }) => {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState<Size>({ width: 0, height: 0 });

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
    const p = canvasToView(scale, viewOrigin, rect);
    const width = rect.width / scale;
    const height = rect.height / scale;
    return { x: p.x, y: p.y, width, height };
  }, [viewOrigin, scale, smctx, selectedShapes]);

  useEffect(() => {
    if (!rootRef.current) return;
    const bounds = rootRef.current.getBoundingClientRect();
    setRootSize({ width: bounds.width, height: bounds.height });
  }, [targetRect]);

  const { size: windowSize } = useWindow();

  const rootAttrs = useMemo(() => {
    if (!targetRect) return;
    return getRootAttrs(targetRect, rootSize.width, rootSize.height, windowSize.width, windowSize.height);
  }, [targetRect, windowSize.width, windowSize.height, rootSize.width, rootSize.height]);

  const [popupedKey, setPopupedKey] = useState("");

  const onClickPopupButton = useCallback(
    (name: string) => {
      if (popupedKey === name) {
        setPopupedKey("");
      } else {
        setPopupedKey(name);
      }
      focusBack?.();
    },
    [popupedKey, focusBack]
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
        focusBack?.();
      }
    },
    [smctx, focusBack]
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
        focusBack?.();
      }
    },
    [smctx, focusBack]
  );

  const onDocInlineAttributesChanged = useCallback(
    (attrs: DocAttributes) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs },
      });
      focusBack?.();
    },
    [smctx, focusBack]
  );

  const onDocBlockAttributesChanged = useCallback(
    (attrs: DocAttributes) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs, block: true },
      });
      focusBack?.();
    },
    [smctx, focusBack]
  );

  const onDocAttributesChanged = useCallback(
    (attrs: DocAttributes) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs, doc: true },
      });
      focusBack?.();
    },
    [smctx, focusBack]
  );

  const indexLineShape = useMemo(() => {
    return indexShape?.type === "line" ? (indexShape as LineShape) : undefined;
  }, [indexShape]);

  const onLineHeadChanged = useCallback(
    (val: { pHead?: LineHead; qHead?: LineHead }) => {
      const ctx = smctx.getCtx();
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const shapeMap = ctx.getShapeMap();
      const patch = ids.reduce<{ [id: string]: Partial<LineShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (shape.type === "line") {
          p[id] = val;
        }
        return p;
      }, {});

      ctx.patchShapes(patch);
      focusBack?.();
    },
    [focusBack, smctx]
  );

  return targetRect ? (
    <div ref={rootRef} {...rootAttrs}>
      <div className="flex gap-1 items-center">
        {indexCommonStyle?.fill ? (
          <PopupButton
            name="fill"
            opened={popupedKey === "fill"}
            popup={<FillPanel fill={indexCommonStyle.fill} onChanged={onFillChanged} />}
            onClick={onClickPopupButton}
          >
            <div
              className="w-8 h-8 border-2 rounded-full"
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
            <div className="w-8 h-8 flex justify-center items-center">
              <div
                className="w-1.5 h-9 border rounded-sm rotate-45"
                style={{ backgroundColor: rednerRGBA(indexCommonStyle.stroke.color) }}
              ></div>
            </div>
          </PopupButton>
        ) : undefined}
        {indexDocAttrInfo ? (
          <>
            <div className="h-8 mx-0.5 border"></div>
            <TextItems
              popupedKey={popupedKey}
              setPopupedKey={onClickPopupButton}
              onInlineChanged={onDocInlineAttributesChanged}
              onBlockChanged={onDocBlockAttributesChanged}
              onDocChanged={onDocAttributesChanged}
              docAttrInfo={indexDocAttrInfo}
            />
          </>
        ) : undefined}
        {indexLineShape ? (
          <>
            <div className="h-8 mx-0.5 border"></div>
            <LineHeadItems
              popupedKey={popupedKey}
              setPopupedKey={onClickPopupButton}
              pHead={indexLineShape.pHead}
              qHead={indexLineShape.qHead}
              onChange={onLineHeadChanged}
            />
          </>
        ) : undefined}
      </div>
    </div>
  ) : undefined;
};

function getRootAttrs(
  targetRect: IRectangle,
  rootWidth: number,
  rootHeight: number,
  windowWidth: number,
  windowHeight: number
) {
  const yMargin = 14;
  const center = getRectCenter(targetRect);
  const bottomY = targetRect.y + targetRect.height + yMargin;
  const p = {
    x: center.x,
    y: windowHeight - 160 < bottomY ? targetRect.y - rootHeight - yMargin : bottomY,
  };
  const baseClass = "fixed border rounded bg-white p-1 ";

  const dx = Math.min(windowWidth - (p.x + rootWidth / 2), 0);
  const tx = p.x - rootWidth / 2 < 0 ? "0" : `calc(${p.x + dx}px - 50%)`;
  const dy = Math.min(windowHeight - (p.y + rootHeight), 0);
  const ty = p.y < 0 ? "0" : `calc(${p.y + dy}px)`;
  return {
    className: baseClass + "top-0 left-0",
    style: {
      transform: `translate(${tx}, ${ty})`,
    },
  };
}
