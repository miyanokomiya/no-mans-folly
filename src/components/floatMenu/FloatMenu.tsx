import { IRectangle, IVec2, add, getRectCenter } from "okageo";
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
  switchShapeType,
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
import { getPatchByChangingCurveType } from "../../shapes/utils/curveLine";
import { getPatchAfterLayouts } from "../../composables/shapeLayoutHandler";
import menuIcon from "../../assets/icons/three_dots_v.svg";
import { ClickOrDragHandler } from "../atoms/ClickOrDragHandler";
import { getShapeTypeList } from "../../composables/shapeTypes";
import { ShapeTypeButton } from "./ShapeTypeButton";
import { patchLinesConnectedToShapeOutline } from "../../composables/lineSnapping";
import { isLinePolygonShape } from "../../shapes/polygons/linePolygon";
import { canMakePolygon, patchLineFromLinePolygon, patchLinePolygonFromLine } from "../../shapes/utils/linePolygon";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";

// Use default root height until it's derived from actual element.
// => It's useful to prevent the menu from slightly translating at the first appearance.
const ROOT_HEIGHT = 44;

// Keep and restore the fixed location.
let rootFixedCache: IVec2 | undefined;

interface Option {
  canvasState: any;
  scale: number;
  viewOrigin: IVec2;
  viewSize: Size;
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
  textEditing: boolean;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
}

export const FloatMenu: React.FC<Option> = ({
  canvasState,
  scale,
  viewOrigin,
  viewSize,
  indexDocAttrInfo,
  focusBack,
  textEditing,
  onContextMenu,
}) => {
  const { shapeStore } = useContext(AppCanvasContext);
  const { handleEvent } = useContext(AppStateMachineContext);
  const { getShapeStruct, setTmpShapeMap, patchShapes, createLastIndex, createFirstIndex } =
    useContext(AppStateContext);
  const draggable = useDraggable();

  const rootRef = useRef<HTMLDivElement>(null);
  const [rootSize, setRootSize] = useState<Size>({ width: 0, height: ROOT_HEIGHT });
  // Once the menu was dragged, stick it to the location.
  const [rootFixed, setRootFixed] = useState<IVec2 | undefined>(rootFixedCache);
  const [dragOrigin, setDragOrigin] = useState<IVec2 | undefined>();

  const indexShape = useMemo<Shape | undefined>(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    canvasState; // For exhaustive-deps

    const id = shapeStore.getLastSelected();
    if (!id) return;

    const shape = shapeStore.shapeComposite.shapeMap[id];
    if (!shape) return;

    const tmp = shapeStore.getTmpShapeMap()[id] ?? {};
    return tmp ? { ...shape, ...tmp } : shape;
  }, [canvasState, shapeStore]);

  const selectedShapes = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    canvasState; // For exhaustive-deps

    const shapeComposite = shapeStore.shapeComposite;
    const shapeMap = shapeComposite.shapeMap;
    const selected = shapeStore.getSelected();
    return Object.keys(selected).map((id) => shapeMap[id]);
  }, [canvasState, shapeStore]);

  const targetRect = useMemo<IRectangle | undefined>(() => {
    if (selectedShapes.length === 0) return;

    const shapeComposite = shapeStore.shapeComposite;
    const rect = shapeComposite.getWrapperRectForShapes(selectedShapes, true);
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

  useEffect(() => {
    if (!dragOrigin || !draggable.v) return;

    const p = add(dragOrigin, draggable.v);
    setRootFixed(p);
  }, [dragOrigin, draggable.v]);

  const rootAttrs = useMemo(() => {
    if (!targetRect || !rootRef.current) {
      // Need to render the menu to get its size, but make it invisible until everything's ready.
      return { className: rootBaseClassName + " invisible" };
    }

    return getRootAttrs(targetRect, rootSize.width, rootSize.height, viewSize.width, viewSize.height, rootFixed);
  }, [targetRect, viewSize, rootSize.width, rootSize.height, rootFixed]);

  const handleMenuAnchorDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!rootRef.current) return;

      const bounds = rootRef.current.getBoundingClientRect();
      setDragOrigin({ x: bounds.x + bounds.width / 2, y: bounds.y });
      draggable.clear();
      draggable.startDrag(e);
    },
    [draggable],
  );

  const handleMenuAnchorClick = useCallback(() => {
    draggable.clear();
    setDragOrigin(undefined);
    setRootFixed(undefined);
  }, [draggable]);

  useEffect(() => {
    rootFixedCache = rootFixed;
  }, [rootFixed]);

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
    (val: Partial<FillStyle>, draft = false) => {
      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(getShapeStruct, shapeMap[id], { fill: val });
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
    (val: Partial<StrokeStyle>, draft = false) => {
      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<Shape> }>((p, id) => {
        p[id] = updateCommonStyle(getShapeStruct, shapeMap[id], { stroke: val });
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

  const highlighShape = useCallback(
    (meta: HighlightShapeMeta) => {
      if (!indexShape) return;

      handleEvent({
        type: "shape-highlight",
        data: { id: indexShape.id, meta },
      });
    },
    [indexShape, handleEvent],
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

  const availableShapeTypeList = useMemo(() => {
    return indexShape ? getShapeTypeList(indexShape.type) : undefined;
  }, [indexShape]);

  const onShapeTypeChanged = useCallback(
    (val: string) => {
      const shapeComposite = shapeStore.shapeComposite;
      const shapeMap = shapeComposite.shapeMap;
      const targets = Object.keys(shapeStore.getSelected())
        .map((id) => shapeMap[id])
        .filter((s) => getShapeTypeList(s.type));
      patchShapes(
        patchPipe(
          [
            (src) => mapReduce(src, (s) => switchShapeType(shapeComposite.getShapeStruct, s, val)),
            ...targets.map(
              (s) => (src: { [id: string]: Shape }) => patchLinesConnectedToShapeOutline(shapeComposite, src[s.id]),
            ),
            (_, patch) => getPatchAfterLayouts(shapeComposite, { update: patch }),
          ],
          toMap(targets),
        ).patch,
      );
      focusBack?.();
    },
    [focusBack, shapeStore, patchShapes],
  );

  const indexLineShape = useMemo(() => {
    return indexShape && isLineShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const indexLinePolygonShape = useMemo(() => {
    return indexShape && isLinePolygonShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);

  const onLineHeadChanged = useCallback(
    (val: { pHead?: LineHead; qHead?: LineHead }, draft = false) => {
      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<LineShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isLineShape(shape)) {
          p[id] = val;
        }
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
    [focusBack, shapeStore, patchShapes, setTmpShapeMap],
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

  const onLineJumpChanged = useCallback(
    (val: boolean) => {
      const shapeComposite = shapeStore.shapeComposite;
      const shapeMap = shapeComposite.shapeMap;
      const lineIds = Object.keys(shapeStore.getSelected());
      const lines = lineIds.map((id) => shapeMap[id]).filter(isLineShape);
      patchShapes(mapReduce(toMap(lines), () => ({ jump: val ? true : undefined }) as Partial<LineShape>));
    },
    [shapeStore, patchShapes],
  );

  const onLinePolygonChanged = useCallback(
    (val: boolean) => {
      const shapeComposite = shapeStore.shapeComposite;
      const shapeMap = shapeComposite.shapeMap;
      const selectedIds = Object.keys(shapeStore.getSelected());

      if (val) {
        const lines = selectedIds.map((id) => shapeMap[id]).filter(isLineShape);
        patchShapes(mapReduce(toMap(lines), (line) => patchLinePolygonFromLine(shapeComposite.getShapeStruct, line)));
      } else {
        const linePolygons = selectedIds.map((id) => shapeMap[id]).filter(isLinePolygonShape);
        patchShapes(
          mapReduce(toMap(linePolygons), (linePolygon) =>
            patchLineFromLinePolygon(shapeComposite.getShapeStruct, linePolygon),
          ),
        );
      }
    },
    [shapeStore, patchShapes],
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

  const handleContextMenuClick = useCallback(
    (e: React.MouseEvent) => {
      const bounds = (e.target as HTMLElement).getBoundingClientRect();
      onContextMenu({ x: bounds.right, y: bounds.top }, true);
    },
    [onContextMenu],
  );

  const popupButtonCommonProps = {
    popupedKey: popupedKey,
    setPopupedKey: onClickPopupButton,
    defaultDirection: popupDefaultDirection,
  };

  return targetRect ? (
    <div ref={rootRef} {...rootAttrs}>
      <div className="flex gap-1 items-center">
        <ClickOrDragHandler onClick={handleMenuAnchorClick} onDragStart={handleMenuAnchorDrag}>
          <div className={"w-3 h-8 border rounded-xs touch-none" + (rootFixed ? " bg-blue-300" : " bg-gray-300")} />
        </ClickOrDragHandler>
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
                className="w-1.5 h-9 border rounded-xs rotate-45"
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
        {indexShape && availableShapeTypeList ? (
          <ShapeTypeButton
            {...popupButtonCommonProps}
            shapeTypeList={availableShapeTypeList}
            selectedType={indexShape.type}
            onChange={onShapeTypeChanged}
          />
        ) : undefined}
        {indexLineShape ? (
          <>
            <div className="h-8 mx-0.5 border"></div>
            <LineTypeButton
              {...popupButtonCommonProps}
              currentType={indexLineShape.lineType}
              currentCurve={indexLineShape.curveType}
              onChange={onLineTypeChanged}
              jump={indexLineShape.jump}
              onJumpChange={onLineJumpChanged}
              polygon={false}
              onPolygonChange={onLinePolygonChanged}
              canMakePolygon={canMakePolygon(indexLineShape)}
            />
            <LineHeadItems
              {...popupButtonCommonProps}
              popupDefaultDirection={popupDefaultDirection}
              lineShape={indexLineShape}
              onChange={onLineHeadChanged}
              highlighShape={highlighShape}
            />
            <button type="button" className="w-8 h-8 flex justify-center items-center" onClick={onClickLineLabel}>
              T
            </button>
          </>
        ) : undefined}
        {indexLinePolygonShape ? (
          <>
            <div className="h-8 mx-0.5 border"></div>
            <LineTypeButton
              {...popupButtonCommonProps}
              onChange={onLineTypeChanged}
              polygon={true}
              onPolygonChange={onLinePolygonChanged}
            />
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
          className="w-10 h-10 border rounded-xs bg-white p-1 flex justify-center items-center"
          onClick={handleContextMenuClick}
        >
          <img src={menuIcon} alt="Context menu" className="w-6 h-6" />
        </button>
      </div>
    </div>
  ) : undefined;
};

const TOP_LOCATED_KEY = "top-located";
const rootBaseClassName = "fixed border rounded-xs shadow-xs w-max h-max bg-white px-1 top-0 left-0";

function getRootAttrs(
  targetRect: IRectangle,
  rootWidth: number,
  rootHeight: number,
  windowWidth: number,
  windowHeight: number,
  fixed?: IVec2,
) {
  const yMargin = 60;
  const center = getRectCenter(targetRect);
  const topY = targetRect.y - yMargin - rootHeight;
  const toBottom = topY < 0;
  const p = fixed ?? {
    x: center.x,
    y: toBottom ? targetRect.y + targetRect.height + yMargin : topY,
  };

  const dx = Math.min(windowWidth - (p.x + rootWidth / 2), 0);
  const tx = p.x - rootWidth / 2 < 0 ? "0" : `calc(${p.x + dx}px - 50%)`;
  const dy = Math.min(windowHeight - (p.y + rootHeight), 0);
  const ty = p.y < 0 ? "0" : `calc(${p.y + dy}px)`;
  return {
    className: rootBaseClassName + (toBottom ? "" : ` ${TOP_LOCATED_KEY}`),
    style: {
      transform: `translate(${tx}, ${ty})`,
    },
  };
}
