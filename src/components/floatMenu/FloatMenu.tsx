import { IRectangle, IVec2, getRectCenter } from "okageo";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";
import {
  canHaveTextPadding,
  getCommonStyle,
  getTextPadding,
  patchShapesOrderToFirst,
  patchShapesOrderToLast,
  patchTextPadding,
  stackOrderDisabled,
  updateCommonStyle,
} from "../../shapes";
import * as geometry from "../../utils/geometry";
import { BoxAlign, BoxPadding, CommonStyle, FillStyle, LineHead, Shape, Size, StrokeStyle } from "../../models";
import { canvasToView } from "../../composables/canvas";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
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
import { BoxPaddingButton } from "./BoxPaddingButton";

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
  const sm = useContext(AppStateMachineContext);
  const smctx = useContext(AppStateContext);

  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState<Size>({ width: 0, height: ROOT_HEIGHT });
  const draggable = useDraggable();

  const indexShape = useMemo<Shape | undefined>(() => {
    const id = smctx.getLastSelectedShapeId();
    if (!id) return;

    const shape = acctx.shapeStore.getEntityMap()[id];
    if (!shape) return;

    const tmp = acctx.shapeStore.getTmpShapeMap()[id] ?? {};
    return tmp ? { ...shape, ...tmp } : shape;
  }, [canvasState, smctx, acctx.shapeStore]);

  const targetRect = useMemo<IRectangle | undefined>(() => {
    const ids = Object.keys(acctx.shapeStore.getSelected());
    if (ids.length === 0) return;

    const shapeComposite = smctx.getShapeComposite();
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

  const popupDefaultDirection: PopupDirection = rootAttrs?.className.includes(TOP_LOCATED_KEY) ? "top" : "bottom";
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
    [popupedKey, focusBack],
  );

  const indexCommonStyle = useMemo<CommonStyle | undefined>(() => {
    if (!indexShape) return;
    return getCommonStyle(smctx.getShapeStruct, indexShape);
  }, [indexShape, smctx]);

  const onFillChanged = useCallback(
    (fill: FillStyle, draft = false) => {
      const ids = Object.keys(smctx.getSelectedShapeIdMap());
      const shapeMap = smctx.getShapeComposite().shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(smctx.getShapeStruct, shapeMap[id], { fill });
        return p;
      }, {});

      if (draft) {
        smctx.setTmpShapeMap(patch);
      } else {
        smctx.setTmpShapeMap({});
        smctx.patchShapes(patch);
        focusBack?.();
      }
    },
    [smctx, focusBack],
  );

  const onStrokeChanged = useCallback(
    (stroke: StrokeStyle, draft = false) => {
      const ids = Object.keys(smctx.getSelectedShapeIdMap());
      const shapeMap = smctx.getShapeComposite().shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(smctx.getShapeStruct, shapeMap[id], { stroke });
        return p;
      }, {});

      if (draft) {
        smctx.setTmpShapeMap(patch);
      } else {
        smctx.setTmpShapeMap({});
        smctx.patchShapes(patch);
        focusBack?.();
      }
    },
    [smctx, focusBack],
  );

  const onDocInlineAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      sm.handleEvent({
        type: "text-style",
        data: { value: attrs, draft },
      });
      focusBack?.();
    },
    [sm, focusBack],
  );

  const onDocBlockAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      sm.handleEvent({
        type: "text-style",
        data: { value: attrs, block: true, draft },
      });
      focusBack?.();
    },
    [sm, focusBack],
  );

  const onDocAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      sm.handleEvent({
        type: "text-style",
        data: { value: attrs, doc: true, draft },
      });
      focusBack?.();
    },
    [sm, focusBack],
  );

  const indexLineShape = useMemo(() => {
    return indexShape && isLineShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const onLineHeadChanged = useCallback(
    (val: { pHead?: LineHead; qHead?: LineHead }) => {
      const ids = Object.keys(smctx.getSelectedShapeIdMap());
      const shapeMap = smctx.getShapeComposite().shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<LineShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isLineShape(shape)) {
          p[id] = val;
        }
        return p;
      }, {});

      smctx.patchShapes(patch);
      focusBack?.();
    },
    [focusBack, smctx],
  );

  const onLineTypeChanged = useCallback(
    (lineType: LineType) => {
      const shapeMap = smctx.getShapeComposite().shapeMap;
      const lineIds = Object.keys(smctx.getSelectedShapeIdMap());
      const lines = lineIds.map((id) => shapeMap[id]).filter(isLineShape);
      smctx.patchShapes(
        patchPipe(
          [
            (src) => mapReduce(src, () => ({ lineType })),
            (src) => {
              const elbowHandler = newElbowLineHandler({
                getShapeComposite: () =>
                  newShapeComposite({ shapes: toList({ ...shapeMap, ...src }), getStruct: smctx.getShapeStruct }),
              });
              return mapReduce(src, (lineShape) => {
                return lineShape.lineType !== "elbow"
                  ? { body: undefined }
                  : { body: elbowHandler.optimizeElbow(lineShape) };
              });
            },
          ],
          toMap(lines),
        ).patch,
      );
    },
    [smctx],
  );

  const onClickLineLabel = useCallback(() => {
    sm.handleEvent({
      type: "state",
      data: { name: "AddingLineLabel" },
    });
  }, [sm]);

  const indexTextShape = useMemo(() => {
    return indexShape && isTextShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const onAlignAnchorChangeed = useCallback(
    (val: BoxAlign) => {
      const ids = Object.keys(smctx.getSelectedShapeIdMap());
      const shapeMap = smctx.getShapeComposite().shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<TextShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isTextShape(shape)) {
          p[id] = val;
        }
        return p;
      }, {});

      smctx.patchShapes(patch);
      focusBack?.();
    },
    [focusBack, smctx],
  );

  const canChangeStack = useMemo<boolean>(() => {
    const shapeComposite = smctx.getShapeComposite();
    const selected = smctx.getSelectedShapeIdMap();
    return shapeComposite.shapes.every((s) => selected[s.id] && stackOrderDisabled(smctx.getShapeStruct, s));
  }, [smctx]);

  const onClickStackLast = useCallback(() => {
    const shapeComposite = smctx.getShapeComposite();
    const selected = smctx.getSelectedShapeIdMap();
    const ids = shapeComposite.shapes
      .filter((s) => selected[s.id] && stackOrderDisabled(smctx.getShapeStruct, s))
      .map((s) => s.id);
    smctx.patchShapes(patchShapesOrderToLast(ids, smctx.createLastIndex()));
    focusBack?.();
  }, [focusBack, smctx]);

  const onClickStackFirst = useCallback(() => {
    const shapeComposite = smctx.getShapeComposite();
    const selected = smctx.getSelectedShapeIdMap();
    const ids = shapeComposite.shapes
      .filter((s) => selected[s.id] && stackOrderDisabled(smctx.getShapeStruct, s))
      .map((s) => s.id);
    smctx.patchShapes(patchShapesOrderToFirst(ids, smctx.createFirstIndex()));
    focusBack?.();
  }, [focusBack, smctx]);

  const canIndexShapeHaveTextPadding = useMemo<boolean>(() => {
    if (!indexShape) return false;
    return canHaveTextPadding(smctx.getShapeStruct, indexShape);
  }, [indexShape, smctx]);

  const indexTextPadding = useMemo<BoxPadding | undefined>(() => {
    if (!indexShape) return;
    return getTextPadding(smctx.getShapeStruct, indexShape);
  }, [indexShape, smctx]);

  const onChangeTextPadding = useCallback(
    (value: BoxPadding, draft?: boolean) => {
      const shapeComposite = smctx.getShapeComposite();
      const shapeMap = shapeComposite.shapeMap;
      const selected = smctx.getSelectedShapeIdMap();
      const patch = mapReduce(selected, (_, id) => {
        const shape = shapeMap[id];
        return patchTextPadding(shapeComposite.getShapeStruct, shape, value);
      });

      if (draft) {
        smctx.setTmpShapeMap(patch);
      } else {
        smctx.patchShapes(patch);
        smctx.setTmpShapeMap({});
      }
      focusBack?.();
    },
    [focusBack, smctx, acctx],
  );

  const popupButtonCommonProps = {
    popupedKey: popupedKey,
    setPopupedKey: onClickPopupButton,
    defaultDirection: popupDefaultDirection,
  };

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
            defaultDirection={popupDefaultDirection}
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
            defaultDirection={popupDefaultDirection}
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
              {...popupButtonCommonProps}
              onInlineChanged={onDocInlineAttributesChanged}
              onBlockChanged={onDocBlockAttributesChanged}
              onDocChanged={onDocAttributesChanged}
              docAttrInfo={indexDocAttrInfo}
            />
          </>
        ) : undefined}
        {canIndexShapeHaveTextPadding ? (
          <BoxPaddingButton {...popupButtonCommonProps} value={indexTextPadding} onChange={onChangeTextPadding} />
        ) : undefined}
        {indexLineShape ? (
          <>
            <div className="h-8 mx-0.5 border"></div>
            <LineTypeButton
              {...popupButtonCommonProps}
              currentType={indexLineShape.lineType}
              onChange={onLineTypeChanged}
            />
            <LineHeadItems
              {...popupButtonCommonProps}
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
          <AlignAnchorButton {...popupButtonCommonProps} boxAlign={indexTextShape} onChange={onAlignAnchorChangeed} />
        ) : undefined}
        {canChangeStack ? (
          <StackButton {...popupButtonCommonProps} onClickLast={onClickStackLast} onClickFirst={onClickStackFirst} />
        ) : undefined}
      </div>
    </div>
  ) : undefined;
};

const TOP_LOCATED_KEY = "top-located";

function getRootAttrs(
  targetRect: IRectangle,
  rootWidth: number,
  rootHeight: number,
  windowWidth: number,
  windowHeight: number,
  translate: IVec2 = { x: 0, y: 0 },
) {
  const yMargin = 60;
  const center = getRectCenter(targetRect);
  const topY = targetRect.y - yMargin - rootHeight + translate.y;
  const toBottom = topY < 0;
  const p = {
    x: center.x + translate.x,
    y: toBottom ? targetRect.y + targetRect.height + yMargin + translate.y : topY,
  };

  const dx = Math.min(windowWidth - (p.x + rootWidth / 2), 0);
  const tx = p.x - rootWidth / 2 < 0 ? "0" : `calc(${p.x + dx}px - 50%)`;
  const dy = Math.min(windowHeight - (p.y + rootHeight), 0);
  const ty = p.y < 0 ? "0" : `calc(${p.y + dy}px)`;
  return {
    className: "fixed border rounded shadow bg-white px-1 top-0 left-0" + (toBottom ? "" : ` ${TOP_LOCATED_KEY}`),
    style: {
      transform: `translate(${tx}, ${ty})`,
    },
  };
}
