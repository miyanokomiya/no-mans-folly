import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppCanvasContext, AppStateMachineContext } from "../contexts/AppCanvasContext";
import { Shape } from "../models";
import { getCommonStruct, getShapeAffine, isPointOn, renderShape } from "../shapes";
import { useCanvas } from "../composables/canvas";
import { getMouseOptions, isAltOrOpt, isCtrlOrMeta } from "../utils/devices";
import { useGlobalMousemoveEffect, useGlobalMouseupEffect } from "../composables/window";
import { findBackward } from "../utils/commons";
import { TextEditor } from "./textEditor/TextEditor";
import { DocOutput } from "../models/document";
import { renderDoc } from "../utils/textEditor";

export function AppCanvas() {
  const acctx = useContext(AppCanvasContext);
  const smctx = useContext(AppStateMachineContext);

  const [canvasState, setCanvasState] = useState({});
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [docMap, setDocMap] = useState<{ [id: string]: DocOutput }>({});
  const [tmpShapeMap, setTmpShapeMap] = useState<{ [id: string]: Partial<Shape> }>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [textEditing, setTextEditing] = useState(false);

  useEffect(() => {
    return acctx.shapeStore.watch(() => {
      smctx.stateMachine.handleEvent({
        type: "shape-updated",
      });
      setShapes(acctx.shapeStore.getEntities());
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  useEffect(() => {
    return acctx.documentStore.watch(() => {
      smctx.stateMachine.handleEvent({
        type: "shape-updated",
      });
      setDocMap(acctx.documentStore.getDocMap());
    });
  }, [acctx.documentStore, smctx.stateMachine]);

  useEffect(() => {
    return smctx.stateMachine.watch(() => {
      setCanvasState({});
    });
  }, [smctx.stateMachine]);

  useEffect(() => {
    return acctx.shapeStore.watchSelected(() => {
      smctx.stateMachine.handleEvent({
        type: "selection",
      });
    });
  }, [acctx.shapeStore, smctx.stateMachine]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const getWrapper = useCallback(() => wrapperRef.current, []);
  const canvas = useCanvas(getWrapper);

  useEffect(() => {
    smctx.setCtx({
      setViewport: canvas.setViewport,
      zoomView: canvas.zoomView,
      getScale: () => canvas.scale,
      panView: canvas.panView,
      startDragging: canvas.startDragging,
      stopDragging: canvas.endMoving,
      setContextMenuList() {},
      setCommandExams() {},
      setCursor,

      undo: acctx.undoManager.undo,
      redo: acctx.undoManager.redo,

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
      deleteShapes: acctx.shapeStore.deleteEntities,
      patchShapes: acctx.shapeStore.patchEntities,
      getTmpShapeMap: () => tmpShapeMap,
      setTmpShapeMap: setTmpShapeMap,

      startTextEditing() {
        setTextEditing(true);
      },
      stopTextEditing() {
        setTextEditing(false);
      },
      getDocumentMap: () => docMap,
      patchDocument: acctx.documentStore.patchDoc,
    });
  }, [canvas, acctx, smctx, shapes, tmpShapeMap, docMap]);

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

    shapes.forEach((shape) => {
      const tmpShape = tmpShapeMap[shape.id];
      if (tmpShape) {
        renderShape(getCommonStruct, ctx, { ...shape, ...tmpShape });
      } else {
        renderShape(getCommonStruct, ctx, shape);
      }

      const doc = docMap[shape.id];
      if (doc) {
        ctx.save();
        ctx.transform(...getShapeAffine(getCommonStruct, shape));
        renderDoc(ctx, doc);
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
    smctx.stateMachine,
    docMap,
  ]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      smctx.stateMachine.handleEvent({
        type: "pointerdown",
        data: {
          point: canvas.viewToCanvas(canvas.mousePoint),
          options: getMouseOptions(e),
        },
      });
    },
    [canvas, smctx]
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
        data: { key: e.key, ctrl: isCtrlOrMeta(e), alt: isAltOrOpt(e), shift: e.shiftKey },
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
    (val: string) => {
      smctx.stateMachine.handleEvent({
        type: "text-input",
        data: {
          value: val,
        },
      });
    },
    [smctx.stateMachine]
  );

  const textEditor = textEditing ? <TextEditor onInput={onTextInput} /> : undefined;

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
      {textEditor}
    </>
  );
}
