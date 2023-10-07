import { IRectangle, IVec2 } from "okageo";
import { DocAttrInfo, DocAttributes, DocDelta, DocOutput } from "../models/document";
import {
  DEFAULT_FONT_SIZE,
  DocCompositionItem,
  DocCompositionLine,
  LINEBREAK,
  applyAttrInfoToDocOutput,
  getBoundsAtLocation,
  getCursorLocation,
  getCursorLocationAt,
  getDeltaByApplyBlockStyle,
  getDocCompositionInfo,
  getDocLength,
  getInitialOutput,
  getOutputAt,
  getRangeLines,
  getWordRangeAtCursor,
  isCursorInDoc,
  isLinebreak,
  mergeDocAttrInfo,
  renderDocByComposition,
  sliceDocOutput,
} from "../utils/textEditor";
import { Size } from "../models";

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
    _isDocEmpty = doc.length === 0;
    _doc = _isDocEmpty ? getInitialOutput() : doc;
    _range = range;
    docLength = getDocLength(_doc);
    updateComposition();
  }

  function updateComposition() {
    if (!_ctx) return;

    const result = getDocCompositionInfo(_doc, _ctx, _range.width, _range.height);
    _compositionLines = result.lines;
    _composition = result.composition;
  }

  function setCursor(c: number, selection = 0) {
    _cursor = Math.max(c, 0);
    _selection = selection;
  }

  function shiftCursorBy(diff: number) {
    setCursor(getMovingCursor() + diff);
  }

  function shiftSelectionBy(diff: number) {
    _selection += diff;
  }

  // This value always refers to the left bound of the selection range.
  function getCursor(): number {
    const c = _selection < 0 ? _cursor + _selection : _cursor;
    // The last character must be line break, and it can't be selected.
    return Math.min(Math.max(c, 0), docLength - 1);
  }

  // This value always refers to positive selection range size.
  function getSelection(): number {
    const c = getCursor();
    const s = Math.min(Math.abs(_selection), docLength - getCursor());
    // The last character must be line break, and it can't be selected.
    return c + s < docLength ? s : docLength - c - 1;
  }

  // This value refers to the last moving position.
  // It can be used as the origin for relative cursor shifting.
  function getMovingCursor(): number {
    // The last character must be line break, and it can't be selected.
    return Math.min(Math.max(_cursor + _selection, 0), docLength - 1);
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

  function isInDoc(p: IVec2): boolean {
    return isCursorInDoc(_composition, _compositionLines, p);
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
      getCursorLocation(_compositionLines, getMovingCursor())
    );
    const p = { x: location.x, y: location.y - location.height * 0.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function moveCursorDown() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getMovingCursor())
    );
    const p = { x: location.x, y: location.y + location.height * 1.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function shiftSelectionUp() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getMovingCursor())
    );
    const p = { x: location.x, y: location.y - location.height * 0.1 };
    _selection = getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)) - _cursor;
  }

  function shiftSelectionDown() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getMovingCursor())
    );
    const p = { x: location.x, y: location.y + location.height * 1.1 };
    _selection = getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)) - _cursor;
  }

  function moveCursorLineHead() {
    const location = getCursorLocation(_compositionLines, getMovingCursor());
    setCursor(getLocationIndex({ x: 0, y: location.y }));
  }

  function moveCursorLineTail() {
    const location = getCursorLocation(_compositionLines, getMovingCursor());
    setCursor(getLocationIndex({ x: getDocLength(_compositionLines[location.y].outputs) - 1, y: location.y }));
  }

  function selectAll() {
    setCursor(0, docLength);
  }

  function selectWordAtCursor() {
    setCursor(...getWordRangeAtCursor(_composition, getCursor()));
  }

  function getCurrentAttributeInfo(): DocAttrInfo {
    const cursor = getCursor();
    const selection = getSelection();
    // When the selection exists, target cursor location should be in the selection: right side of the cursor.
    // Otherwise: left side of the cursor.
    const location = getCursorLocation(_compositionLines, cursor + (selection > 0 ? 1 : 0));
    const line = _compositionLines[location.y];

    // Cursor attributes should be picked from the left side of the cursor.
    // When there's no left side item in the line, pick the right side item.
    const cursorLeft = getOutputAt(line, Math.max(location.x, 0)).attributes;
    const lineEnd = line.outputs[line.outputs.length - 1];
    const docEnd = _doc[_doc.length - 1];
    return { cursor: cursorLeft, block: lineEnd.attributes, doc: docEnd.attributes };
  }

  function getContentSize(): Size {
    const height = _compositionLines.reduce((p, l) => p + l.height, 0);
    return { width: _range.width, height };
  }

  function getSelectedDocOutput(): DocOutput {
    const cursor = getCursor();
    const selection = getSelection();
    return sliceDocOutput(_doc, cursor, cursor + selection);
  }

  function getDeltaByPaste(pasted: DocOutput, plain = false): DocDelta {
    if (plain) {
      const text = pasted.flatMap((p) => p.insert).join("");
      return getDeltaByInput(text);
    }

    const cursor = getCursor();
    const selection = getSelection();
    const ret: DocDelta = [{ retain: cursor }];

    if (selection > 0) {
      ret.push({ delete: selection });
    }

    const attrInfo = mergeDocAttrInfo(getCurrentAttributeInfo());
    const outputs = applyAttrInfoToDocOutput(pasted, attrInfo);
    ret.push(...outputs);

    if (_isDocEmpty) {
      ret.push(getInitialOutput()[0]);
    }

    return ret;
  }

  function getDeltaByInput(text: string): DocDelta {
    const cursor = getCursor();
    const selection = getSelection();
    const ret: DocDelta = [{ retain: cursor }];

    if (selection > 0) {
      ret.push({ delete: selection });
    }

    const attrs = mergeDocAttrInfo(getCurrentAttributeInfo());
    const list = text.split(LINEBREAK);
    list.forEach((block, i) => {
      if (block) ret.push({ insert: block, attributes: attrs });
      if (i !== list.length - 1) {
        ret.push({ insert: "\n", attributes: attrs });
      }
    });

    if (_isDocEmpty) {
      ret.push(getInitialOutput()[0]);
    }

    return ret;
  }

  function getDeltaAndCursorByBackspace(): { delta: DocDelta; cursor: number } {
    if (_isDocEmpty) return { delta: getInitialOutput(), cursor: 0 };
    if (_composition.length === 1) return { delta: [], cursor: 0 };

    const cursor = getCursor();
    const selection = getSelection();
    if (selection > 0) {
      return { cursor, delta: [{ retain: cursor }, { delete: Math.max(1, selection) }] };
    } else {
      return { cursor: cursor - 1, delta: [{ retain: cursor - 1 }, { delete: 1 }] };
    }
  }

  function getDeltaAndCursorByDelete(): { delta: DocDelta; cursor: number } {
    if (_isDocEmpty) return { delta: getInitialOutput(), cursor: 0 };
    if (_composition.length === 1) return { delta: [], cursor: 0 };

    const cursor = getCursor();
    const selection = getSelection();
    if (selection > 0) {
      return { cursor, delta: [{ retain: cursor }, { delete: Math.max(1, selection) }] };
    } else {
      return { cursor, delta: [{ retain: cursor }, { delete: 1 }] };
    }
  }

  function getDeltaByApplyInlineStyle(attrs: DocAttributes): DocDelta {
    if (_isDocEmpty) return getInitialOutput(attrs);

    const cursor = getCursor();
    const selection = getSelection();

    // When the selection reaches the doc end, apply the style to the line break at the doc end.
    // => Otherwise, there's no way to change inline style of it but changing whole doc style.
    const adjustedSelection = cursor + selection === docLength - 1 ? selection + 1 : selection;

    if (adjustedSelection === 0) return [];
    return [{ retain: cursor }, { retain: adjustedSelection, attributes: attrs }];
  }

  function _getDeltaByApplyBlockStyle(attrs: DocAttributes): DocDelta {
    if (_isDocEmpty) return getInitialOutput(attrs);

    const cursor = getCursor();
    const selection = getSelection();
    return getDeltaByApplyBlockStyle(_composition, cursor, selection, attrs);
  }

  function getDeltaByApplyDocStyle(attrs: DocAttributes): DocDelta {
    if (_isDocEmpty) return getInitialOutput(attrs);
    return [{ retain: docLength - 1 }, { retain: 1, attributes: attrs }];
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

    renderDocByComposition(ctx, _composition, _compositionLines);

    if (!isIME) {
      renderSelection(ctx, {
        composition: _composition,
        compositionLines: _compositionLines,
        cursor,
        selection,
      });
    }

    renderCursor(ctx, {
      composition: _composition,
      compositionLines: _compositionLines,
      cursor,
      selection,
      movingCursor: getMovingCursor(),
      isIME,
    });
  }

  return {
    setRenderingContext,
    setDoc,

    setCursor,
    getCursor,
    getSelection,
    shiftCursorBy,
    shiftSelectionBy,
    moveCursorToHead,
    moveCursorToTail,
    moveCursorUp,
    moveCursorDown,
    shiftSelectionUp,
    shiftSelectionDown,
    selectAll,
    moveCursorLineHead,
    moveCursorLineTail,
    selectWordAtCursor,
    getLocationIndex,

    getDocLength: () => docLength,
    getContentSize,
    getSelectedDocOutput,
    getDeltaByPaste,

    getDeltaByInput,
    getDeltaAndCursorByBackspace,
    getDeltaAndCursorByDelete,
    getCurrentAttributeInfo,
    getDeltaByApplyInlineStyle,
    getDeltaByApplyBlockStyle: _getDeltaByApplyBlockStyle,
    getDeltaByApplyDocStyle,

    getLocationAt,
    isInDoc,
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
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.fillRect(a0.bounds.x, a0.bounds.y, a1.bounds.x + a1.bounds.width - a0.bounds.x, a1.bounds.height);
    ctx.globalAlpha = 1;
  });
}

function renderCursor(
  ctx: CanvasRenderingContext2D,
  {
    composition,
    compositionLines,
    cursor,
    selection,
    movingCursor,
    isIME,
  }: {
    composition: DocCompositionItem[];
    compositionLines: DocCompositionLine[];
    cursor: number;
    selection: number;
    movingCursor: number;
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
      const c = composition[movingCursor];
      ctx.beginPath();
      ctx.moveTo(c.bounds.x, c.bounds.y);
      ctx.lineTo(c.bounds.x, c.bounds.y + c.bounds.height);
      ctx.stroke();
    }
  } else {
    const c = composition[composition.length - 1];
    ctx.beginPath();
    // When the last character is line break, the cursor should be in new line.
    if (isLinebreak(c.char)) {
      ctx.moveTo(1, c.bounds.y + c.bounds.height);
      ctx.lineTo(1, c.bounds.y + c.bounds.height * 2);
    } else {
      ctx.moveTo(c.bounds.x + c.bounds.width, c.bounds.y);
      ctx.lineTo(c.bounds.x + c.bounds.width, c.bounds.y + c.bounds.height);
    }
    ctx.stroke();
  }
}
