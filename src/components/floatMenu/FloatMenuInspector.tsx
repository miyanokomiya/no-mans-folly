import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo, useState } from "react";
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
import { BoxAlign, BoxPadding, CommonStyle, FillStyle, LineHead, Shape, StrokeStyle } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { FillPanel } from "./FillPanel";
import { StrokePanel } from "./StrokePanel";
import { TextItems } from "./TextItems";
import { DocAttrInfo, DocAttributes } from "../../models/document";
import { LineHeadItems } from "./LineHeadItems";
import { CurveType, LineShape, LineType, isLineShape } from "../../shapes/line";
import { StackButton } from "./StackButton";
import { AlignAnchorButton } from "./AlignAnchorButton";
import { TextShape, isTextShape } from "../../shapes/text";
import { LineTypeButton } from "./LineTypeButton";
import { mapReduce, patchPipe, toList, toMap } from "../../utils/commons";
import { newElbowLineHandler } from "../../composables/elbowLineHandler";
import { newShapeComposite } from "../../composables/shapeComposite";
import { BoxPaddingButton } from "./BoxPaddingButton";
import { getPatchByChangingCurveType } from "../../shapes/utils/curveLine";
import { getPatchAfterLayouts, getPatchByLayouts } from "../../composables/shapeLayoutHandler";
import menuIcon from "../../assets/icons/three_dots_v.svg";
import { getShapeTypeList } from "../../composables/shapeTypes";
import { ShapeTypeButton } from "./ShapeTypeButton";
import { patchLinesConnectedToShapeOutline } from "../../composables/lineSnapping";
import { isLinePolygonShape, LinePolygonShape } from "../../shapes/polygons/linePolygon";
import { canMakePolygon, patchLineFromLinePolygon, patchLinePolygonFromLine } from "../../shapes/utils/linePolygon";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";
import { FloatMenuVnNodeItems } from "./FloatMenuVnNodeItems";

interface Props {
  canvasState: any;
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
  textEditing: boolean;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
}

export const FloatMenuInspector: React.FC<Props> = ({
  canvasState,
  indexDocAttrInfo,
  focusBack,
  textEditing,
  onContextMenu,
}) => {
  const { shapeStore } = useContext(AppCanvasContext);
  const { handleEvent } = useContext(AppStateMachineContext);
  const {
    getShapeStruct,
    setTmpShapeMap,
    patchShapes,
    createLastIndex,
    createFirstIndex,
    updateShapes,
    getSelectedSheet,
  } = useContext(AppStateContext);
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

  const popupDefaultDirection: PopupDirection = "top";
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

  const patchLines = useCallback(
    (val: Partial<LineShape>, shouldLayout = false) => {
      const shapeComposite = shapeStore.shapeComposite;
      const shapeMap = shapeComposite.shapeMap;
      const lineIds = Object.keys(shapeStore.getSelected());
      const lines = lineIds.map((id) => shapeMap[id]).filter(isLineShape);
      if (shouldLayout) {
        updateShapes({ update: mapReduce(toMap(lines), () => val) });
      } else {
        patchShapes(mapReduce(toMap(lines), () => val));
      }
    },
    [shapeStore, patchShapes, updateShapes],
  );
  const onLineJumpChanged = useCallback(
    (val: boolean) => {
      patchLines({ jump: val ? true : undefined });
    },
    [patchLines],
  );
  const onLineOptimalHookChanged = useCallback(
    (val: boolean) => {
      patchLines({ optimalHook: val ? true : undefined }, true);
    },
    [patchLines],
  );

  const onLinePolygonChanged = useCallback(
    (val: boolean, polyline?: boolean) => {
      const shapeComposite = shapeStore.shapeComposite;
      const shapeMap = shapeComposite.shapeMap;
      const selectedIds = Object.keys(shapeStore.getSelected());
      const patch: { [id: string]: Partial<Shape> } = {};

      if (val) {
        selectedIds.forEach((id) => {
          const shape = shapeMap[id];
          if (isLineShape(shape)) {
            patch[id] = patchLinePolygonFromLine(shapeComposite.getShapeStruct, shape, polyline ? 1 : undefined);
          } else if (isLinePolygonShape(shape)) {
            if (polyline && shape.polygonType !== 1) {
              patch[id] = { polygonType: 1 } as Partial<LinePolygonShape>;
            } else if (!polyline && shape.polygonType !== undefined) {
              patch[id] = { polygonType: undefined } as Partial<LinePolygonShape>;
            }
          }
        });
      } else {
        selectedIds.forEach((id) => {
          const shape = shapeMap[id];
          if (isLinePolygonShape(shape)) {
            patch[id] = patchLineFromLinePolygon(shapeComposite.getShapeStruct, shape);
          }
        });
      }

      patchShapes(patch);
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
    const layoutPatch = getPatchByLayouts(shapeStore.shapeComposite, {
      update: patchShapesOrderToLast(ids, createLastIndex()),
    });
    patchShapes(layoutPatch);
    focusBack?.();
  }, [focusBack, selectedShapes, getShapeStruct, patchShapes, createLastIndex, shapeStore]);

  const onClickStackFirst = useCallback(() => {
    const ids = selectedShapes.filter((s) => !stackOrderDisabled(getShapeStruct, s)).map((s) => s.id);
    const layoutPatch = getPatchByLayouts(shapeStore.shapeComposite, {
      update: patchShapesOrderToFirst(ids, createFirstIndex()),
    });
    patchShapes(layoutPatch);
    focusBack?.();
  }, [focusBack, selectedShapes, getShapeStruct, patchShapes, createFirstIndex, shapeStore]);

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
      onContextMenu({ x: (bounds.left + bounds.right) / 2, y: bounds.bottom }, true);
    },
    [onContextMenu],
  );

  const popupButtonCommonProps = {
    popupedKey: popupedKey,
    setPopupedKey: onClickPopupButton,
    defaultDirection: popupDefaultDirection,
  };

  return (
    <div className="flex gap-1 items-center">
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
            sheetId={getSelectedSheet()?.id ?? ""}
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
            optimalHook={indexLineShape.optimalHook}
            onOptimalHookChange={onLineOptimalHookChanged}
            polygonType={"line"}
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
            polygonType={indexLinePolygonShape.polygonType === 1 ? "polyline" : "polygon"}
            onPolygonChange={onLinePolygonChanged}
          />
        </>
      ) : undefined}
      {indexTextShape ? (
        <AlignAnchorButton {...popupButtonCommonProps} boxAlign={indexTextShape} onChange={onAlignAnchorChangeed} />
      ) : undefined}
      {indexShape ? (
        <FloatMenuVnNodeItems {...popupButtonCommonProps} indexShape={indexShape} focusBack={focusBack} />
      ) : undefined}
      {canChangeStack ? (
        <StackButton {...popupButtonCommonProps} onClickLast={onClickStackLast} onClickFirst={onClickStackFirst} />
      ) : undefined}
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
