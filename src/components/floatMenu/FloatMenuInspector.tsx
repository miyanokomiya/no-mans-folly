import { IVec2 } from "okageo";
import { useCallback, useContext, useMemo, useState } from "react";
import { AppCanvasContext } from "../../contexts/AppCanvasContext";
import { AppStateContext, AppStateMachineContext } from "../../contexts/AppContext";
import { canHaveTextPadding, getTextPadding, patchTextPadding, switchShapeType } from "../../shapes";
import { BoxAlign, BoxPadding, LineHead, Shape, StrokeStyle } from "../../models";
import { PopupButton, PopupDirection } from "../atoms/PopupButton";
import { rednerRGBA } from "../../utils/color";
import { StrokePanel } from "./StrokePanel";
import { TextItems } from "./TextItems";
import { DocAttrInfo, DocAttributes } from "../../models/document";
import { LineHeadItems } from "./LineHeadItems";
import { CurveType, LineShape, LineType, isLineShape } from "../../shapes/line";
import { AlignAnchorButton } from "./AlignAnchorButton";
import { TextShape, isTextShape } from "../../shapes/text";
import { LineTypeButton } from "./LineTypeButton";
import { mapReduce, patchPipe, toList, toMap } from "../../utils/commons";
import { newElbowLineHandler } from "../../composables/elbowLineHandler";
import { newShapeComposite } from "../../composables/shapeComposite";
import { BoxPaddingButton } from "./BoxPaddingButton";
import { getPatchByChangingCurveType } from "../../shapes/utils/curveLine";
import { getPatchAfterLayouts } from "../../composables/shapeLayoutHandler";
import { getShapeTypeList } from "../../composables/shapeTypes";
import { ShapeTypeButton } from "./ShapeTypeButton";
import { patchLinesConnectedToShapeOutline } from "../../composables/lineSnapping";
import { isLinePolygonShape, LinePolygonShape } from "../../shapes/polygons/linePolygon";
import { canMakePolygon, patchLineFromLinePolygon, patchLinePolygonFromLine } from "../../shapes/utils/linePolygon";
import { HighlightShapeMeta } from "../../composables/states/appCanvas/core";
import { FloatMenuVnNodeItems } from "./FloatMenuVnNodeItems";
import { isTableShape, TableShape } from "../../shapes/table/table";
import { InspectorLayout } from "./InspectorLayout";
import { useSelectedTmpShape } from "../../hooks/storeHooks";

const popupDefaultDirection: PopupDirection = "top";

interface Props {
  indexDocAttrInfo?: DocAttrInfo;
  focusBack?: () => void;
  textEditing: boolean;
  onContextMenu: (p: IVec2, toggle?: boolean) => void;
}

export const FloatMenuInspector: React.FC<Props> = ({ indexDocAttrInfo, focusBack, textEditing, onContextMenu }) => {
  const { shapeStore } = useContext(AppCanvasContext);
  const { handleEvent } = useContext(AppStateMachineContext);
  const { getShapeStruct, setTmpShapeMap, patchShapes, updateShapes, getSelectedSheet } = useContext(AppStateContext);
  const indexShape = useSelectedTmpShape();

  const [popupKey, setPopupKey] = useState("");
  const handlePopupKeyChange = useCallback(
    (name: string) => {
      setPopupKey(popupKey === name ? "" : name);
      focusBack?.();
    },
    [popupKey, focusBack],
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

  const indexTableShape = useMemo(() => {
    return indexShape && isTableShape(indexShape) ? indexShape : undefined;
  }, [indexShape]);
  const tableBodyStroke = indexTableShape?.bodyStroke ?? indexTableShape?.stroke;
  const onBodyStrokeChanged = useCallback(
    (val: Partial<StrokeStyle>, draft = false) => {
      if (!indexTableShape || !tableBodyStroke) return;

      const ids = Object.keys(shapeStore.getSelected());
      const shapeMap = shapeStore.shapeComposite.shapeMap;
      const patch = ids.reduce<{ [id: string]: Partial<TableShape> }>((p, id) => {
        const shape = shapeMap[id];
        if (isTableShape(shape)) {
          p[id] = { bodyStroke: { ...(shape.bodyStroke ?? shape.stroke), ...val } };
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
    [focusBack, shapeStore, patchShapes, setTmpShapeMap, indexTableShape, tableBodyStroke],
  );

  const popupButtonCommonProps = {
    popupedKey: popupKey,
    setPopupedKey: handlePopupKeyChange,
    defaultDirection: popupDefaultDirection,
  };

  if (!indexShape) return;

  return (
    <div className="flex gap-1 items-center">
      <InspectorLayout
        indexShape={indexShape}
        popupKey={popupKey}
        onPopupKeyChange={handlePopupKeyChange}
        onContextMenu={onContextMenu}
        focusBack={focusBack}
      >
        {indexTableShape && tableBodyStroke ? (
          <PopupButton
            name="body-stroke"
            opened={popupKey === "body-stroke"}
            popup={<StrokePanel stroke={tableBodyStroke} onChanged={onBodyStrokeChanged} />}
            onClick={handlePopupKeyChange}
            defaultDirection={popupDefaultDirection}
          >
            <div className="w-8 h-8 relative">
              <div
                className="w-8 h-1.5 border rounded-xs absolute top-1/2 left-0 -translate-y-1/2"
                style={{ backgroundColor: rednerRGBA(tableBodyStroke.color) }}
              ></div>
              <div
                className="w-1.5 h-8 border rounded-xs absolute top-0 left-1/2 -translate-x-1/2"
                style={{ backgroundColor: rednerRGBA(tableBodyStroke.color) }}
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
      </InspectorLayout>
    </div>
  );
};
