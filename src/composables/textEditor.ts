import { IRectangle, IVec2 } from "okageo";
import { DocDelta, DocOutput } from "../models/document";
import {
  DEFAULT_FONT_SIZE,
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
  let _isDocEmpty = false; // Even if the doc is empty, line break must exist at the end.

  let isIME = false;

  function setRenderingContext(ctx: CanvasRenderingContext2D) {
    if (_ctx) {
      _ctx = ctx;
      updateComposition();
    } else {
      _ctx = ctx;
    }
  }

  function setDoc(doc: DocOutput = [], range: IRectangle) {
    console.log(doc);
    _isDocEmpty = doc.length === 0;
    _doc = _isDocEmpty ? [{ insert: "\n" }] : doc;
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
    _selection = selection;
  }

  function shiftCursorBy(diff: number) {
    setCursor(getCursor() + diff);
  }

  function shiftSelectionBy(diff: number) {
    _selection += diff;
  }

  function getCursor(): number {
    const c = _selection < 0 ? _cursor + _selection : _cursor;
    // The last character must be line break, and it can't be selected.
    return Math.min(Math.max(c, 0), docLength - 1);
  }

  function getSelection(): number {
    const c = getCursor();
    const s = Math.min(Math.abs(_selection), docLength - getCursor());
    return c + s < docLength ? s : docLength - c - 1;
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
    setCursor(0);
  }

  function moveCursorToTail() {
    setCursor(docLength);
  }

  function moveCursorUp() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getCursor())
    );
    const p = { x: location.x, y: location.y - location.height * 0.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function moveCursorDown() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getCursor())
    );
    const p = { x: location.x, y: location.y + location.height * 1.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function getDeltaByInput(text: string): DocDelta {
    const cursor = getCursor();
    const selection = getSelection();
    const ret: DocDelta = [{ retain: cursor }];

    if (selection > 0) {
      ret.push({ delete: selection });
    }

    ret.push({ insert: text });

    if (_isDocEmpty) {
      ret.push({ insert: "\n" });
    }

    return ret;
  }

  function getBoundsAtIME(): IRectangle | undefined {
    if (!_composition || !_compositionLines) return;
    return getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getCursor() + getSelection())
    );
  }

  function startIME(length: number) {
    isIME = true;
    shiftSelectionBy(-length);
  }

  function stopIME() {
    isIME = false;
    _selection = 0;
  }

  function render(ctx: CanvasRenderingContext2D) {
    if (!_ctx) {
      setRenderingContext(ctx);
      updateComposition();
    }

    if (!_composition || !_compositionLines) return;

    const cursor = getCursor();
    const selection = getSelection();

    if (!isIME) {
      renderSelection(ctx, {
        composition: _composition,
        compositionLines: _compositionLines,
        cursor,
        selection,
      });
    }

    renderDocByComposition(ctx, _composition, _compositionLines);
    renderCursor(ctx, {
      composition: _composition,
      compositionLines: _compositionLines,
      cursor,
      selection,
      isIME,
    });
  }

  return {
    setRenderingContext,
    setDoc,
    setCursor,
    shiftCursorBy,
    shiftSelectionBy,
    getCursor,
    getSelection,
    moveCursorToHead,
    moveCursorToTail,
    moveCursorUp,
    moveCursorDown,
    getDeltaByInput,
    getLocationIndex,
    getLocationAt,
    getBoundsAtIME,
    startIME,
    stopIME,
    render,
  };
}
export type TextEditorController = ReturnType<typeof newTextEditorController>;

function renderSelection(
  ctx: CanvasRenderingContext2D,
  {
    composition,
    compositionLines,
    cursor,
    selection,
  }: {
    composition: DocCompositionItem[];
    compositionLines: DocCompositionLine[];
    cursor: number;
    selection: number;
  }
) {
  const range = getRangeLines(composition, compositionLines, [cursor, selection]);
  range.forEach((line) => {
    if (line.length === 0) return;
    const a0 = line[0];
    const a1 = line[line.length - 1];
    ctx.fillStyle = "#0000ff";
    ctx.beginPath();
    ctx.fillRect(a0.bounds.x, a0.bounds.y, a1.bounds.x + a1.bounds.width - a0.bounds.x, a1.bounds.height);
  });
}

function renderCursor(
  ctx: CanvasRenderingContext2D,
  {
    composition,
    compositionLines,
    cursor,
    selection,
    isIME,
  }: {
    composition: DocCompositionItem[];
    compositionLines: DocCompositionLine[];
    cursor: number;
    selection: number;
    isIME: boolean;
  }
) {
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.setLineDash([]);

  if (composition.length === 0) {
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(1, DEFAULT_FONT_SIZE);
    ctx.stroke();
  } else if (cursor < composition.length) {
    const c = composition[cursor];

    if (isIME) {
      const range = getRangeLines(composition, compositionLines, [cursor, selection]);
      ctx.beginPath();

      range.forEach((line) => {
        if (line.length === 0) return;
        const head = line[0];
        const tail = line[line.length - 1];
        ctx.moveTo(head.bounds.x, head.bounds.y + head.bounds.height);
        ctx.lineTo(tail.bounds.x + tail.bounds.width, tail.bounds.y + tail.bounds.height);
      });

      const cs = composition[cursor + selection - 1];
      ctx.moveTo(cs.bounds.x + cs.bounds.width, cs.bounds.y);
      ctx.lineTo(cs.bounds.x + cs.bounds.width, cs.bounds.y + cs.bounds.height);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(c.bounds.x, c.bounds.y);
      ctx.lineTo(c.bounds.x, c.bounds.y + c.bounds.height);
      ctx.stroke();
    }
  } else {
    const c = composition[composition.length - 1];
    ctx.beginPath();
    // When the last character is line break, the cursor should be in new line.
    if (c.char === "\n") {
      ctx.moveTo(1, c.bounds.y + c.bounds.height);
      ctx.lineTo(1, c.bounds.y + c.bounds.height * 2);
    } else {
      ctx.moveTo(c.bounds.x + c.bounds.width, c.bounds.y);
      ctx.lineTo(c.bounds.x + c.bounds.width, c.bounds.y + c.bounds.height);
    }
    ctx.stroke();
  }
}
