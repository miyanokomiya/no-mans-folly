import { IRectangle, IVec2 } from "okageo";
import { DocOutput } from "../models/document";
import {
  DocCompositionItem,
  DocCompositionLine,
  getBoundsAtLocation,
  getCursorLocation,
  getCursorLocationAt,
  getDocComposition,
  getDocLength,
  getLineOutputs,
  getRangeLines,
  renderDocByComposition,
} from "../utils/textEditor";

export function newTextEditorController() {
  let _ctx: CanvasRenderingContext2D;
  let _doc: DocOutput;
  let docLength = 0;
  let _cursor = 0;
  let _selection = 0;
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

  function setCursor(c: number, selection = 0) {
    _cursor = Math.max(c, 0);
    _selection = Math.max(selection, 0);
  }

  function getCursor(): number {
    return Math.min(_cursor, docLength);
  }

  function getLocationIndex(location: IVec2): number {
    const charIndex = _compositionLines.slice(0, location.y).reduce((n, line) => {
      return n + line.outputs.reduce((m, o) => m + o.insert.length, 0);
    }, 0);

    return charIndex + location.x;
  }

  function getLocationAt(p: IVec2): IVec2 {
    return getCursorLocationAt(_composition, _compositionLines, p);
  }

  function moveCursorToHead() {
    _cursor = 0;
  }

  function moveCursorToTail() {
    _cursor = docLength;
  }

  function moveCursorUp() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, _cursor)
    );
    const p = { x: location.x, y: location.y - location.height * 0.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function moveCursorDown() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, _cursor)
    );
    const p = { x: location.x, y: location.y + location.height * 1.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function render(ctx: CanvasRenderingContext2D) {
    if (!_ctx) {
      setRenderingContext(ctx);
      updateComposition();
    }

    if (!_composition || !_compositionLines || _composition.length === 0) return;

    const cursor = getCursor();

    const range = getRangeLines(_composition, _compositionLines, [cursor, _selection]);
    range.forEach((line) => {
      if (line.length === 0) return;
      const a0 = line[0];
      const a1 = line[line.length - 1];
      ctx.fillStyle = "#0000ff";
      ctx.beginPath();
      ctx.fillRect(a0.bounds.x, a0.bounds.y, a1.bounds.x + a1.bounds.width - a0.bounds.x, a1.bounds.height);
    });

    renderDocByComposition(ctx, _composition, _compositionLines);

    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    if (cursor < _composition.length) {
      const c = _composition[cursor];
      ctx.moveTo(c.bounds.x, c.bounds.y);
      ctx.lineTo(c.bounds.x, c.bounds.y + c.bounds.height);
    } else {
      const c = _composition[_composition.length - 1];
      // When the last character is line break, the cursor should be in new line.
      if (c.char === "\n") {
        ctx.moveTo(0, c.bounds.y + c.bounds.height);
        ctx.lineTo(0, c.bounds.y + c.bounds.height * 2);
      } else {
        ctx.moveTo(c.bounds.x + c.bounds.width, c.bounds.y);
        ctx.lineTo(c.bounds.x + c.bounds.width, c.bounds.y + c.bounds.height);
      }
    }
    ctx.stroke();
  }

  return {
    setRenderingContext,
    setDoc,
    setCursor,
    getCursor,
    moveCursorToHead,
    moveCursorToTail,
    moveCursorUp,
    moveCursorDown,
    render,
    getLocationIndex,
    getLocationAt,
  };
}
export type TextEditorController = ReturnType<typeof newTextEditorController>;
