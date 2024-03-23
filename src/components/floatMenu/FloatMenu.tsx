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
import { BoxAlign, BoxPadding, CommonStyle, FillStyle, LineHead, Shape, Size, StrokeStyle } from "../../models";
import { canvasToView } from "../../hooks/canvas";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import { StrokePanel } from "./StrokePanel";
import { TextItems } from "./TextItems";
import { DocAttrInfo, DocAttributes } from "../../models/document";
import { useWindow } from "../../hooks/window";
import { LineHeadItems } from "./LineHeadItems";
import { CurveType, LineShape, LineType, isLineShape } from "../../shapes/line";
import { StackButton } from "./StackButton";
import { useDraggable } from "../../hooks/draggable";
import { AlignAnchorButton } from "./AlignAnchorButton";
import { TextShape, isTextShape } from "../../shapes/text";
import { LineTypeButton } from "./LineTypeButton";
import { mapReduce, patchPipe, toList, toMap } from "../../utils/commons";
import { newElbowLineHandler } from "../../composables/elbowLineHandler";
import { newShapeComposite } from "../../composables/shapeComposite";
import { BoxPaddingButton } from "./BoxPaddingButton";
import { getPatchByChangingCurveType } from "../../utils/curveLine";
import { getPatchAfterLayouts } from "../../composables/shapeLayoutHandler";
import menuIcon from "../../assets/icons/three_dots_v.svg";

// Use default root height until it's derived from actual element.
// => It's useful to prevent the menu from slightly translating at the first appearance.
const ROOT_HEIGHT = 44;

interface Option {
  canvasState: any;
  scale: number;
  viewOrigin: IVec2;
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
  textEditing: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const FloatMenu: React.FC<Option> = ({
  canvasState,
  scale,
  viewOrigin,
  indexDocAttrInfo,
  focusBack,
  textEditing,
  onContextMenu,
}) => {
  const { shapeStore } = useContext(AppCanvasContext);
  const { handleEvent } = useContext(AppStateMachineContext);
  const { getShapeStruct, setTmpShapeMap, patchShapes, createLastIndex, createFirstIndex } =
    useContext(AppStateContext);

  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState<Size>({ width: 0, height: ROOT_HEIGHT });
  const draggable = useDraggable();

  const indexShape = useMemo<Shape | undefined>(() => {
    canvasState; // For exhaustive-deps

    const id = shapeStore.getLastSelected();
    if (!id) return;

    const shape = shapeStore.getEntityMap()[id];
    if (!shape) return;

    const tmp = shapeStore.getTmpShapeMap()[id] ?? {};
    return tmp ? { ...shape, ...tmp } : shape;
  }, [canvasState, shapeStore]);

  const selectedShapes = useMemo(() => {
    canvasState; // For exhaustive-deps

    const shapeComposite = shapeStore.shapeComposite;
    const shapeMap = shapeComposite.shapeMap;
    const selected = shapeStore.getSelected();
    return Object.keys(selected).map((id) => shapeMap[id]);
  }, [canvasState, shapeStore]);

  const targetRect = useMemo<IRectangle | undefined>(() => {
    if (selectedShapes.length === 0) return;

    const shapeComposite = shapeStore.shapeComposite;
    const rect = shapeComposite.getWrapperRectForShapes(selectedShapes);
    const p = canvasToView(scale, viewOrigin, rect);
    const width = rect.width / scale;
    const height = rect.height / scale;
    return { x: p.x, y: p.y, width, height };
  }, [viewOrigin, scale, shapeStore, selectedShapes]);

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
  }, [draggable.v, rootAttrsFixed, rootAttrs]);

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
    return getCommonStyle(getShapeStruct, indexShape);
  }, [indexShape, getShapeStruct]);

  const onFillChanged = useCallback(
    (fill: FillStyle, draft = false) => {
      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(getShapeStruct, shapeMap[id], { fill });
        return p;
      }, {});

      if (draft) {
        setTmpShapeMap(patch);
      } else {
        setTmpShapeMap({});
        patchShapes(patch);
        focusBack?.();
      }
    },
    [shapeStore, focusBack, getShapeStruct, setTmpShapeMap, patchShapes],
  );

  const onStrokeChanged = useCallback(
    (stroke: StrokeStyle, draft = false) => {
      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(getShapeStruct, shapeMap[id], { stroke });
        return p;
      }, {});

      if (draft) {
        setTmpShapeMap(patch);
      } else {
        setTmpShapeMap({});
        patchShapes(patch);
        focusBack?.();
      }
    },
    [shapeStore, focusBack, getShapeStruct, setTmpShapeMap, patchShapes],
  );

  const onDocInlineAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      handleEvent({
        type: "text-style",
        data: { value: attrs, draft },
      });
      focusBack?.();
    },
    [handleEvent, focusBack],
  );

  const onDocBlockAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      handleEvent({
        type: "text-style",
        data: { value: attrs, block: true, draft },
      });
      focusBack?.();
    },
    [handleEvent, focusBack],
  );

  const onDocAttributesChanged = useCallback(
    (attrs: DocAttributes, draft?: boolean) => {
      handleEvent({
        type: "text-style",
        data: { value: attrs, doc: true, draft },
      });
      focusBack?.();
    },
    [handleEvent, focusBack],
  );

  const indexLineShape = useMemo(() => {
    return indexShape && isLineShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const onLineHeadChanged = useCallback(
    (val: { pHead?: LineHead; qHead?: LineHead }) => {
      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<LineShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isLineShape(shape)) {
          p[id] = val;
        }
        return p;
      }, {});

      patchShapes(patch);
      focusBack?.();
    },
    [focusBack, shapeStore, patchShapes],
  );

  const onLineTypeChanged = useCallback(
    (lineType: LineType, curveType?: CurveType) => {
      const shapeComposite = shapeStore.shapeComposite;
      const shapeMap = shapeComposite.shapeMap;
      const lineIds = Object.keys(shapeStore.getSelected());
      const lines = lineIds.map((id) => shapeMap[id]).filter(isLineShape);
      patchShapes(
        patchPipe(
          [
            (src) => mapReduce(src, () => ({ lineType })),
            (src) => {
              const elbowHandler = newElbowLineHandler({
                getShapeComposite: () =>
                  newShapeComposite({ shapes: toList({ ...shapeMap, ...src }), getStruct: getShapeStruct }),
              });
              return mapReduce(src, (lineShape) => {
                return lineShape.lineType !== "elbow"
                  ? (shapeMap[lineShape.id] as LineShape).lineType === "elbow"
                    ? { body: undefined } // Reset "body" when elbow line becomes straight.
                    : {}
                  : { body: elbowHandler.optimizeElbow(lineShape) };
              });
            },
            (src) => mapReduce(src, (line) => getPatchByChangingCurveType(line, curveType, true) ?? {}),
            (_, patch) => {
              return getPatchAfterLayouts(shapeComposite, { update: patch });
            },
          ],
          toMap(lines),
        ).patch,
      );
    },
    [shapeStore, patchShapes, getShapeStruct],
  );

  const onClickLineLabel = useCallback(() => {
    handleEvent({
      type: "state",
      data: { name: "AddingLineLabel" },
    });
  }, [handleEvent]);

  const indexTextShape = useMemo(() => {
    return indexShape && isTextShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const onAlignAnchorChangeed = useCallback(
    (val: BoxAlign) => {
      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<TextShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isTextShape(shape)) {
          p[id] = val;
        }
        return p;
      }, {});

      patchShapes(patch);
      focusBack?.();
    },
    [focusBack, shapeStore, patchShapes],
  );

  const canChangeStack = useMemo<boolean>(() => {
    const shapeComposite = shapeStore.shapeComposite;
    return !!indexShape && !stackOrderDisabled(shapeComposite.getShapeStruct, indexShape);
  }, [indexShape, shapeStore]);

  const onClickStackLast = useCallback(() => {
    const ids = selectedShapes.filter((s) => !stackOrderDisabled(getShapeStruct, s)).map((s) => s.id);
    patchShapes(patchShapesOrderToLast(ids, createLastIndex()));
    focusBack?.();
  }, [focusBack, selectedShapes, getShapeStruct, patchShapes, createLastIndex]);

  const onClickStackFirst = useCallback(() => {
    const ids = selectedShapes.filter((s) => !stackOrderDisabled(getShapeStruct, s)).map((s) => s.id);
    patchShapes(patchShapesOrderToFirst(ids, createFirstIndex()));
    focusBack?.();
  }, [focusBack, selectedShapes, getShapeStruct, patchShapes, createFirstIndex]);

  const canIndexShapeHaveTextPadding = useMemo<boolean>(() => {
    if (!indexShape) return false;
    return canHaveTextPadding(getShapeStruct, indexShape);
  }, [indexShape, getShapeStruct]);

  const indexTextPadding = useMemo<BoxPadding | undefined>(() => {
    if (!indexShape) return;
    return getTextPadding(getShapeStruct, indexShape);
  }, [indexShape, getShapeStruct]);

  const onChangeTextPadding = useCallback(
    (value: BoxPadding, draft?: boolean) => {
      const shapeComposite = shapeStore.shapeComposite;
      const shapeMap = shapeComposite.shapeMap;
      const selected = shapeStore.getSelected();
      const patch = mapReduce(selected, (_, id) => {
        const shape = shapeMap[id];
        return patchTextPadding(shapeComposite.getShapeStruct, shape, value);
      });

      if (draft) {
        setTmpShapeMap(patch);
      } else {
        patchShapes(patch);
        setTmpShapeMap({});
      }
      // It's better not to call "focusBack" here.
      // => Number sliders can keep focused and handle arrow-key inputs.
    },
    [shapeStore, setTmpShapeMap, patchShapes],
  );

  const popupButtonCommonProps = {
    popupedKey: popupedKey,
    setPopupedKey: onClickPopupButton,
    defaultDirection: popupDefaultDirection,
  };

  return targetRect ? (
    <div ref={rootRef} {...rootAttrs}>
      <div className="flex gap-1 items-center">
        <div className="w-2 h-8 border rounded bg-gray-300 touch-none" onPointerDown={draggable.startDrag}></div>
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
              textEditing={textEditing}
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
              currentCurve={indexLineShape.curveType}
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
        <button
          type="button"
          className="w-10 h-10 border rounded bg-white p-1 flex justify-center items-center"
          onClick={onContextMenu}
        >
          <img src={menuIcon} alt="Context menu" className="w-6 h-6" />
        </button>
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
