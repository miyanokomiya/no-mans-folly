import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { Shape } from "../models";
import { getCommonStruct, getShapeTextBounds, isPointOn, renderShape } from "../shapes";
import { useCanvas } from "../composables/canvas";
import { getMouseOptions, isAltOrOpt, isCtrlOrMeta } from "../utils/devices";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "../composables/window";
import { findBackward } from "../utils/commons";
import { TextEditor } from "./textEditor/TextEditor";
import { DocAttrInfo, DocOutput } from "../models/document";
import { getDocAttributes, renderDoc } from "../utils/textEditor";
import { IVec2 } from "okageo";
import { FloatMenu } from "./floatMenu/FloatMenu";

export function AppCanvas() {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [canvasState, setCanvasState] = useState({});
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [docMap, setDocMap] = useState<{ [id: string]: DocOutput }>({});
  const [tmpShapeMap, setTmpShapeMap] = useState<{ [id: string]: Partial<Shape> }>({});
  const [selectedInfo, setSelectedInfo] = useState<[last: string, map: { [id: string]: true }] | undefined>();
  const [cursor, setCursor] = useState<string | undefined>();
  const [textEditing, setTextEditing] = useState(false);
  const [textEditorPosition, setTextEditorPosition] = useState<IVec2>({ x: 0, y: 0 });
  const [currentDocAttrInfo, setCurrentDocAttrInfo] = useState<DocAttrInfo>({});
  const [floatMenuAvailable, setFloatMenuAvailable] = useState(false);

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      setShapes(acctx.shapeStore.getEntities());
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchTmpShapeMap(() => {
      setTmpShapeMap(acctx.shapeStore.getTmpShapeMap());
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      const last = acctx.shapeStore.getLastSelected();
      if (last) {
        setSelectedInfo([last, acctx.shapeStore.getSelected()]);
      } else {
        setSelectedInfo(undefined);
      }
    });
  }, [acctx.shapeStore]);

  useEffect(() => {
    return acctx.documentStore.watch(() => {
      setDocMap(acctx.documentStore.getDocMap());
    });
  }, [acctx.documentStore, smctx.stateMachine]);

  useEffect(() => {
    return smctx.stateMachine.watch(() => {
      setCanvasState({});
    });
  }, [smctx.stateMachine]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const getWrapper = useCallback(() => wrapperRef.current, []);
  const canvas = useCanvas(getWrapper);

  useEffect(() => {
    smctx.setCtx({
      getRenderCtx: () => canvasRef.current?.getContext("2d") ?? undefined,
      setViewport: canvas.setViewport,
      zoomView: canvas.zoomView,
      getScale: () => canvas.scale,
      panView: canvas.panView,
      startDragging: canvas.startDragging,
      stopDragging: canvas.endMoving,

      toView: canvas.canvasToView,
      showFloatMenu: () => setFloatMenuAvailable(true),
      hideFloatMenu: () => setFloatMenuAvailable(false),
      setContextMenuList() {},
      setCommandExams() {},
      setCursor,

      undo: acctx.undoManager.undo,
      redo: acctx.undoManager.redo,
      setCaptureTimeout: acctx.undoManager.setCaptureTimeout,

      getShapeMap: acctx.shapeStore.getEntityMap,
      getSelectedShapeIdMap: acctx.shapeStore.getSelected,
      getLastSelectedShapeId: acctx.shapeStore.getLastSelected,
      getShapeAt(p) {
        return findBackward(shapes, (s) => isPointOn(getCommonStruct, s, p));
      },
      selectShape: acctx.shapeStore.select,
      multiSelectShapes: acctx.shapeStore.multiSelect,
      clearAllSelected: acctx.shapeStore.clearAllSelected,
      addShapes: acctx.shapeStore.addEntities,
      deleteShapes: (ids: string[]) => {
        acctx.shapeStore.transact(() => {
          acctx.shapeStore.deleteEntities(ids);
          acctx.documentStore.deleteDocs(ids);
        });
      },
      patchShapes: acctx.shapeStore.patchEntities,
      getTmpShapeMap: () => tmpShapeMap,
      setTmpShapeMap: acctx.shapeStore.setTmpShapeMap,

      startTextEditing() {
        setTextEditing(true);
      },
      stopTextEditing() {
        setTextEditing(false);
      },
      setTextEditorPosition: (p) => {
        setTextEditorPosition(canvas.canvasToView(p));
      },
      getDocumentMap: () => docMap,
      patchDocuments: acctx.documentStore.patchDocs,
      setCurrentDocAttrInfo,
    });
  }, [canvas, canvas.scale, acctx, smctx, shapes, tmpShapeMap, docMap]);

  useEffect(() => {
    smctx.stateMachine.handleEvent({
      type: "shape-updated",
    });
  }, [acctx.documentStore, smctx.stateMachine, shapes, docMap]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      smctx.stateMachine.handleEvent({
        type: "selection",
      });
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasAttrs = useMemo(
    () => ({
      className: "w-max h-max absolute top-0 left-0",
      width: canvas.viewSize.width,
      height: canvas.viewSize.height,
    }),
    [canvas.viewSize.width, canvas.viewSize.height]
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.resetTransform();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(1 / canvas.scale, 1 / canvas.scale);
    ctx.translate(-canvas.viewOrigin.x, -canvas.viewOrigin.y);

    const selectedMap = smctx.getCtx().getSelectedShapeIdMap();
    shapes.forEach((shape) => {
      const tmpShape = tmpShapeMap[shape.id];
      const latestShape = tmpShape ? { ...shape, ...tmpShape } : shape;
      renderShape(getCommonStruct, ctx, latestShape);

      const doc = docMap[latestShape.id];
      if (doc) {
        if (textEditing && selectedMap[shape.id]) return;

        ctx.save();
        const bounds = getShapeTextBounds(getCommonStruct, latestShape);
        ctx.transform(...bounds.affine);
        renderDoc(ctx, doc, bounds.range);
        ctx.restore();
      }
    });

    smctx.stateMachine.render(ctx);
  }, [
    shapes,
    tmpShapeMap,
    canvas.viewSize.width,
    canvas.viewSize.height,
    canvas.scale,
    canvas.viewOrigin.x,
    canvas.viewOrigin.y,
    canvasState,
    smctx,
    docMap,
    textEditing,
  ]);

  const [downTimestamp, setDownTimestamp] = useState(0);
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const data = {
        point: canvas.viewToCanvas(canvas.mousePoint),
        options: getMouseOptions(e),
      };

      const timestamp = Date.now();
      if (timestamp - downTimestamp < 300) {
        smctx.stateMachine.handleEvent({ type: "pointerdoubledown", data });
      } else {
        smctx.stateMachine.handleEvent({ type: "pointerdown", data });
      }
      setDownTimestamp(timestamp);
    },
    [canvas, smctx, downTimestamp]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      canvas.setMousePoint(canvas.removeRootPosition({ x: e.pageX, y: e.pageY }));
      if (!canvas.editStartPoint) return;

      smctx.stateMachine.handleEvent({
        type: "pointermove",
        data: {
          start: canvas.viewToCanvas(canvas.editStartPoint),
          current: canvas.viewToCanvas(canvas.mousePoint),
          ctrl: isCtrlOrMeta(e),
          command: e.metaKey,
          alt: isAltOrOpt(e),
          shift: e.shiftKey,
          scale: canvas.scale,
        },
      });
    },
    [canvas, smctx]
  );
  useGlobalMousemoveEffect(onMouseMove);

  const focus = useCallback(() => {
    if (textEditing) return;
    wrapperRef.current?.focus();
  }, [textEditing]);

  const onMouseHover = useCallback(
    (e: React.MouseEvent) => {
      focus();
      smctx.stateMachine.handleEvent({
        type: "pointerhover",
        data: {
          current: canvas.viewToCanvas(canvas.mousePoint),
          ctrl: isCtrlOrMeta(e),
          command: e.metaKey,
          alt: isAltOrOpt(e),
          shift: e.shiftKey,
          scale: canvas.scale,
        },
      });
    },
    [canvas, smctx, focus]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      smctx.stateMachine.handleEvent({
        type: "pointerup",
        data: {
          point: canvas.viewToCanvas(canvas.mousePoint),
          options: getMouseOptions(e),
        },
      });
    },
    [canvas, smctx]
  );
  useGlobalMouseupEffect(onMouseUp);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      smctx.stateMachine.handleEvent({
        type: "keydown",
        data: {
          key: e.key,
          ctrl: isCtrlOrMeta(e),
          command: e.metaKey,
          alt: isAltOrOpt(e),
          shift: e.shiftKey,
          prevent: () => e.preventDefault(),
        },
      });
    },
    [smctx]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      smctx.stateMachine.handleEvent({
        type: "wheel",
        data: {
          delta: { x: e.deltaX, y: e.deltaY },
          options: getMouseOptions(e),
        },
      });
    },
    [smctx]
  );

  const onTextInput = useCallback(
    (val: string, composition = false) => {
      smctx.stateMachine.handleEvent({
        type: "text-input",
        data: {
          value: val,
          composition,
        },
      });
    },
    [smctx.stateMachine]
  );

  const indexDocAttrInfo = useMemo<DocAttrInfo | undefined>(() => {
    if (!selectedInfo) return;
    if (textEditing) return currentDocAttrInfo;

    const id = selectedInfo[0];
    if (!id) return;

    const doc = docMap[id];
    if (!doc) return;

    const attrs = getDocAttributes(doc);
    return { cursor: attrs, block: attrs, doc: attrs };
  }, [currentDocAttrInfo, textEditing, selectedInfo, docMap]);

  const textEditor = textEditing ? (
    <TextEditor onInput={onTextInput} onKeyDown={onKeyDown} position={textEditorPosition} />
  ) : undefined;

  const floatMenu = floatMenuAvailable ? <FloatMenu canvas={canvas} indexDocAttrInfo={indexDocAttrInfo} /> : undefined;

  return (
    <>
      <div
        ref={wrapperRef}
        className="box-border border border-black relative w-full h-full"
        style={{ cursor }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseHover}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        tabIndex={-1}
      >
        <canvas ref={canvasRef} {...canvasAttrs}></canvas>
        <div className="absolute left-0 bottom-0">{smctx.stateMachine.getStateSummary().label}</div>
      </div>
      {floatMenu}
      {textEditor}
    </>
  );
}
