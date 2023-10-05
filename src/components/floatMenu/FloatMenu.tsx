import { IRectangle, IVec2, getRectCenter } from "okageo";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../../contexts/AppCanvasContext";
import { getCommonStyle, patchShapesOrderToFirst, patchShapesOrderToLast, updateCommonStyle } from "../../shapes";
import * as geometry from "../../utils/geometry";
import { BoxAlign, CommonStyle, FillStyle, LineHead, Shape, Size, StrokeStyle } from "../../models";
import { canvasToView } from "../../composables/canvas";
import { PopupButton } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import { StrokePanel } from "./StrokePanel";
import { TextItems } from "./TextItems";
import { DocAttrInfo, DocAttributes } from "../../models/document";
import { useWindow } from "../../composables/window";
import { LineHeadItems } from "./LineHeadItems";
import { LineShape, LineType, isLineShape } from "../../shapes/line";
import { StackButton } from "./StackButton";
import { useDraggable } from "../../composables/draggable";
import { AlignAnchorButton } from "./AlignAnchorButton";
import { TextShape, isTextShape } from "../../shapes/text";
import { LineTypeButton } from "./LineTypeButton";
import { mapReduce, patchPipe, toList, toMap } from "../../utils/commons";
import { newElbowLineHandler } from "../../composables/elbowLineHandler";
import { newShapeComposite } from "../../composables/shapeComposite";

// Use default root height until it's derived from actual element.
// => It's useful to prevent the menu from slightly translating at the first appearance.
const ROOT_HEIGHT = 44;

interface Option {
  canvasState: any;
  scale: number;
  viewOrigin: IVec2;
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
}

export const FloatMenu: React.FC<Option> = ({ canvasState, scale, viewOrigin, indexDocAttrInfo, focusBack }) => {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState<Size>({ width: 0, height: ROOT_HEIGHT });
  const draggable = useDraggable();

  const indexShape = useMemo<Shape | undefined>(() => {
    const ctx = smctx.getCtx();
    const id = ctx.getLastSelectedShapeId();
    if (!id) return;

    const shape = acctx.shapeStore.getEntityMap()[id];
    if (!shape) return;

    const tmp = acctx.shapeStore.getTmpShapeMap()[id] ?? {};
    return tmp ? { ...shape, ...tmp } : shape;
  }, [canvasState, smctx, acctx.shapeStore]);

  const targetRect = useMemo<IRectangle | undefined>(() => {
    const ids = Object.keys(acctx.shapeStore.getSelected());
    if (ids.length === 0) return;

    const ctx = smctx.getCtx();
    const shapeComposite = ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const rect = geometry.getWrapperRect(ids.map((id) => shapeComposite.getWrapperRect(shapeMap[id])));
    const p = canvasToView(scale, viewOrigin, rect);
    const width = rect.width / scale;
    const height = rect.height / scale;
    return { x: p.x, y: p.y, width, height };
  }, [canvasState, viewOrigin, scale, smctx, acctx.shapeStore]);

  useEffect(() => {
    if (!rootRef.current) return;

    const bounds = rootRef.current.getBoundingClientRect();
    setRootSize({ width: bounds.width, height: bounds.height });
  }, [targetRect]);

  const { size: windowSize } = useWindow();

  // Once the menu was dragged, stick it to the current location.
  const [rootAttrsFixed, setRootAttrsFixed] = useState<ReturnType<typeof getRootAttrs>>();
  const rootAttrs = useMemo(() => {
    if (!targetRect) return;
    if (rootAttrsFixed && draggable.v) {
      return {
        ...rootAttrsFixed,
        style: {
          transform: rootAttrsFixed.style.transform + ` translate(${draggable.v.x}px, ${draggable.v.y}px)`,
        },
      };
    }
    return getRootAttrs(targetRect, rootSize.width, rootSize.height, windowSize.width, windowSize.height, draggable.v);
  }, [targetRect, windowSize.width, windowSize.height, rootSize.width, rootSize.height, draggable.v, rootAttrsFixed]);
  useEffect(() => {
    if (rootAttrsFixed || !draggable.v) return;
    setRootAttrsFixed(rootAttrs);
  }, [draggable.v, rootAttrsFixed]);

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
      const shapeMap = ctx.getShapeComposite().shapeMap;
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
      const shapeMap = ctx.getShapeComposite().shapeMap;
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
    (attrs: DocAttributes, draft?: boolean) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs, draft },
      });
      focusBack?.();
    },
    [smctx, focusBack]
  );

  const onDocBlockAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs, block: true, draft },
      });
      focusBack?.();
    },
    [smctx, focusBack]
  );

  const onDocAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      smctx.stateMachine.handleEvent({
        type: "text-style",
        data: { value: attrs, doc: true, draft },
      });
      focusBack?.();
    },
    [smctx, focusBack]
  );

  const indexLineShape = useMemo(() => {
    return indexShape && isLineShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const onLineHeadChanged = useCallback(
    (val: { pHead?: LineHead; qHead?: LineHead }) => {
      const ctx = smctx.getCtx();
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<LineShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isLineShape(shape)) {
          p[id] = val;
        }
        return p;
      }, {});

      ctx.patchShapes(patch);
      focusBack?.();
    },
    [focusBack, smctx]
  );

  const onLineTypeChanged = useCallback(
    (lineType: LineType) => {
      const ctx = smctx.getCtx();
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const lineIds = Object.keys(ctx.getSelectedShapeIdMap());
      const lines = lineIds.map((id) => shapeMap[id]).filter(isLineShape);
      ctx.patchShapes(
        patchPipe(
          [
            (src) => mapReduce(src, () => ({ lineType })),
            (src) => {
              const elbowHandler = newElbowLineHandler({
                getShapeComposite: () =>
                  newShapeComposite({ shapes: toList({ ...shapeMap, ...src }), getStruct: ctx.getShapeStruct }),
              });
              return mapReduce(src, (lineShape) => {
                return lineShape.lineType !== "elbow"
                  ? { body: undefined }
                  : { body: elbowHandler.optimizeElbow(lineShape) };
              });
            },
          ],
          toMap(lines)
        ).patch
      );
    },
    [smctx]
  );

  const onClickLineLabel = useCallback(() => {
    smctx.stateMachine.handleEvent({
      type: "state",
      data: { name: "AddingLineLabel" },
    });
  }, [smctx]);

  const indexTextShape = useMemo(() => {
    return indexShape && isTextShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const onAlignAnchorChangeed = useCallback(
    (val: BoxAlign) => {
      const ctx = smctx.getCtx();
      const ids = Object.keys(ctx.getSelectedShapeIdMap());
      const shapeMap = ctx.getShapeComposite().shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<TextShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isTextShape(shape)) {
          p[id] = val;
        }
        return p;
      }, {});

      ctx.patchShapes(patch);
      focusBack?.();
    },
    [focusBack, smctx]
  );

  const onClickStackLast = useCallback(() => {
    const ctx = smctx.getCtx();
    const selected = ctx.getSelectedShapeIdMap();
    const ids = acctx.shapeStore
      .getEntities()
      .filter((s) => selected[s.id])
      .map((s) => s.id);
    ctx.patchShapes(patchShapesOrderToLast(ids, ctx.createLastIndex()));
    focusBack?.();
  }, [focusBack, smctx, acctx]);

  const onClickStackFirst = useCallback(() => {
    const ctx = smctx.getCtx();
    const selected = ctx.getSelectedShapeIdMap();
    const ids = acctx.shapeStore
      .getEntities()
      .filter((s) => selected[s.id])
      .map((s) => s.id);
    ctx.patchShapes(patchShapesOrderToFirst(ids, ctx.createFirstIndex()));
    focusBack?.();
  }, [focusBack, smctx, acctx]);

  return targetRect ? (
    <div ref={rootRef} {...rootAttrs}>
      <div className="flex gap-1 items-center">
        <div className="w-2 h-8 border rounded bg-gray-300" onMouseDown={draggable.startDrag}></div>
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
            <LineTypeButton
              popupedKey={popupedKey}
              setPopupedKey={onClickPopupButton}
              currentType={indexLineShape.lineType}
              onChange={onLineTypeChanged}
            />
            <LineHeadItems
              popupedKey={popupedKey}
              setPopupedKey={onClickPopupButton}
              pHead={indexLineShape.pHead}
              qHead={indexLineShape.qHead}
              onChange={onLineHeadChanged}
            />
            <button type="button" className="w-8 h-8 flex justify-center items-center" onClick={onClickLineLabel}>
              T
            </button>
          </>
        ) : undefined}
        {indexTextShape ? (
          <AlignAnchorButton
            popupedKey={popupedKey}
            setPopupedKey={onClickPopupButton}
            boxAlign={indexTextShape}
            onChange={onAlignAnchorChangeed}
          />
        ) : undefined}
        <StackButton
          popupedKey={popupedKey}
          setPopupedKey={onClickPopupButton}
          onClickLast={onClickStackLast}
          onClickFirst={onClickStackFirst}
        />
      </div>
    </div>
  ) : undefined;
};

function getRootAttrs(
  targetRect: IRectangle,
  rootWidth: number,
  rootHeight: number,
  windowWidth: number,
  windowHeight: number,
  translate: IVec2 = { x: 0, y: 0 }
) {
  const yMargin = 60;
  const center = getRectCenter(targetRect);
  const topY = targetRect.y - yMargin - rootHeight + translate.y;
  const p = {
    x: center.x + translate.x,
    y: topY < 0 ? targetRect.y + targetRect.height + yMargin + translate.y : topY,
  };
  const baseClass = "fixed border rounded shadow bg-white px-1 ";

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
