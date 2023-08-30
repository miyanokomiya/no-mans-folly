import { IRectangle } from "okageo";
import { DocAttributes, DocOutput } from "../models/document";
import {
  DocCompositionItem,
  DocCompositionLine,
  getDocComposition,
  getDocLength,
  getLineOutputs,
  renderDocByComposition,
} from "../utils/textEditor";

export function newTextEditorController() {
  let _ctx: CanvasRenderingContext2D;
  let _doc: DocOutput;
  let docLength = 0;
  let _cursor = 0;
  let _range: IRectangle;
  let _compositionLines: DocCompositionLine[];
  let _composition: DocCompositionItem[];

  function setRenderingContext(ctx: CanvasRenderingContext2D) {
    if (_ctx) {
      _ctx = ctx;
      updateComposition();
    } else {
      _ctx = ctx;
    }
  }

  function setDoc(doc: DocOutput = [], range: IRectangle) {
    _doc = doc;
    _range = range;
    docLength = getDocLength(_doc);
    updateComposition();
  }

  function updateComposition() {
    if (!_ctx) return;
    _compositionLines = getLineOutputs(_ctx, _doc, _range);
    _composition = getDocComposition(_ctx, _compositionLines);
  }

  function setCursor(c: number) {
    _cursor = Math.max(c, 0);
  }

  function getCursor(): number {
    return Math.min(_cursor, docLength);
  }

  function moveCursorToHead() {
    _cursor = 0;
  }

  function moveCursorToTail() {
    _cursor = docLength;
  }

  function render(ctx: CanvasRenderingContext2D) {
    if (!_ctx) {
      setRenderingContext(ctx);
      updateComposition();
    }

    if (!_composition || !_compositionLines) return;
    renderDocByComposition(ctx, _composition, _compositionLines);

    const cursor = getCursor();
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    if (cursor < _composition.length) {
      const c = _composition[cursor];
      ctx.moveTo(c.bounds.x, c.bounds.y);
      ctx.lineTo(c.bounds.x, c.bounds.y + c.bounds.height);
    } else {
      const c = _composition[cursor - 1];
      ctx.moveTo(c.bounds.x + c.bounds.width, c.bounds.y);
      ctx.lineTo(c.bounds.x + c.bounds.width, c.bounds.y + c.bounds.height);
    }
    ctx.stroke();
  }

  return { setRenderingContext, setDoc, setCursor, getCursor, moveCursorToHead, moveCursorToTail, render };
}
export type TextEditorController = ReturnType<typeof newTextEditorController>;
