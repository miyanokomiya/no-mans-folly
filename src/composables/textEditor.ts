import { IRectangle, IVec2 } from "okageo";
import { DocAttrInfo, DocAttributes, DocDelta, DocOutput } from "../models/document";
import {
  applyAttrInfoToDocOutput,
  getBoundsAtLocation,
  getCursorLocation,
  getCursorLocationAt,
  getDeltaByApplyBlockStyle,
  getDocCompositionInfo,
  getDocLength,
  getInitialOutput,
  getLineEndIndex,
  getLineHeadIndex,
  getRangeLines,
  getWordRangeAtCursor,
  isCursorInDoc,
  isLinebreak,
  mergeDocAttrInfo,
  renderDocByComposition,
  sliceDocOutput,
  getRawCursor,
  getDocRawLength,
} from "../utils/texts/textEditor";
import {
  DEFAULT_FONT_SIZE,
  DocCompositionItem,
  DocCompositionLine,
  LINK_STYLE_ATTRS,
} from "../utils/texts/textEditorCore";
import * as textEditorUtil from "../utils/texts/textEditor";
import { Size, UserSetting } from "../models";
import { CanvasCTX } from "../utils/types";
import { ModifierOptions } from "../utils/devices";
import { generateShapeLink } from "../utils/texts/textLink";
import { clipboardShapeSerializer } from "./clipboardSerializers";
import { newCallback } from "../utils/stateful/reactives";

export type TextEditorInputOptions = Pick<ModifierOptions, "shift"> & Pick<UserSetting, "listDetection">;

type TextEditorControllerOptions = { sheetId: string };

export function newTextEditorController(options: TextEditorControllerOptions) {
  const cursorCallback = newCallback<[cursor: number, selection: number]>();
  let _ctx: CanvasCTX;
  let _doc: DocOutput;
  let docLength = 0;
  let outputLength = 0;
  // cursor and selection are based on graphemes.
  // To access raw index of outputs, use "getRawCursor" to convert it.
  let _cursor = 0;
  let _selection = 0;
  let _range: IRectangle;
  let _compositionLines: DocCompositionLine[];
  let _composition: DocCompositionItem[];
  let _isDocEmpty = false; // Even if the doc is empty, line break must exist at the end.

  let isIME = false;

  function setRenderingContext(ctx: CanvasCTX) {
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
    outputLength = getDocRawLength(_doc);
    updateComposition();
  }

  function updateComposition() {
    if (!_ctx) return;

    const result = getDocCompositionInfo(_doc, _ctx, _range.width, _range.height);
    _compositionLines = result.lines;
    _composition = result.composition;
  }

  /**
   * Make sure to use this function to update the cursor and the selection
   */
  function setCursor(c: number, selection = 0) {
    _cursor = Math.max(c, 0);
    _selection = selection;
    cursorCallback.dispatch([_cursor, _selection]);
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

  function getOutputCursor(): number {
    return getRawCursor(_composition, getCursor());
  }

  function getOutputSelection(): number {
    return textEditorUtil.getOutputSelection(_composition, getCursor(), getSelection());
  }

  // This value refers to the last moving position.
  // It can be used as the origin for relative cursor shifting.
  function getMovingCursor(): number {
    // The last character must be line break, and it can't be selected.
    return Math.min(Math.max(_cursor + _selection, 0), docLength - 1);
  }

  function getLocationIndex(location: IVec2): number {
    return textEditorUtil.getLocationIndex(_compositionLines, location);
  }

  function getLocationAt(p: IVec2, floor = false): IVec2 {
    return getCursorLocationAt(_composition, _compositionLines, p, floor);
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
      getCursorLocation(_compositionLines, getMovingCursor()),
    );
    const p = { x: location.x, y: location.y - location.height * 0.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function moveCursorDown() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getMovingCursor()),
    );
    const p = { x: location.x, y: location.y + location.height * 1.1 };
    setCursor(getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)));
  }

  function shiftSelectionUp() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getMovingCursor()),
    );
    const p = { x: location.x, y: location.y - location.height * 0.1 };
    setCursor(_cursor, getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)) - _cursor);
  }

  function shiftSelectionDown() {
    const location = getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getMovingCursor()),
    );
    const p = { x: location.x, y: location.y + location.height * 1.1 };
    setCursor(_cursor, getLocationIndex(getCursorLocationAt(_composition, _compositionLines, p)) - _cursor);
  }

  function moveCursorLineHead() {
    setCursor(getLineHeadIndex(_composition, getMovingCursor()));
  }

  function moveCursorLineTail() {
    setCursor(getLineEndIndex(_composition, getMovingCursor()));
  }

  function selectAll() {
    setCursor(0, docLength);
  }

  function selectWordAtCursor() {
    setCursor(...getWordRangeAtCursor(_composition, getCursor()));
  }

  function getCurrentAttributeInfo(): DocAttrInfo {
    return getAttributeInfoAt(getCursor(), getSelection());
  }

  function getAttributeInfoAt(cursor: number, selection = 0): DocAttrInfo {
    // When the selection exists, target cursor location should be in the selection: right side of the cursor.
    // Otherwise: left side of the cursor.
    const location = getCursorLocation(_compositionLines, cursor + (selection > 0 ? 1 : 0));

    // Cursor attributes should be picked from the left side of the cursor.
    // When there's no left side item in the line, pick the right side item.
    const cursorLeft = textEditorUtil.getNewInlineAttributesAt(
      _compositionLines.map((l) => l.outputs),
      location,
    );

    // Seek the line end
    const lineEndIndex = getLineEndIndex(_composition, cursor);
    const lineEndLocation = getCursorLocation(_compositionLines, lineEndIndex);
    const lineEnd = _compositionLines[lineEndLocation.y].outputs[lineEndLocation.x];

    const docEnd = _doc[_doc.length - 1];
    return {
      cursor: cursorLeft,
      block: textEditorUtil.deleteInlineExclusiveAttibutes(lineEnd.attributes),
      doc: textEditorUtil.deleteInlineExclusiveAttibutes(docEnd.attributes),
    };
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

  function getDeltaByPaste(pasted: DocOutput, plain = false): { delta: DocDelta; cursor: number; selection: number } {
    if (plain) {
      const text = pasted.flatMap((p) => p.insert).join("");
      const selection = getOutputSelection();
      const pasteAsPlain = () => {
        const [delta, nextCursor] = getDeltaByInputForPlainText(text);
        return {
          delta,
          cursor: nextCursor,
          selection: 0,
        };
      };
      if (selection === 0) return pasteAsPlain();

      if (textEditorUtil.isUrlText(text)) {
        // Make current selection link when pasted text is URL
        return {
          delta: [
            { retain: getOutputCursor() },
            { retain: selection, attributes: { ...LINK_STYLE_ATTRS, link: text } },
          ],
          cursor: getCursor(),
          selection: getSelection(),
        };
      }

      try {
        // Check if the text is shape template. If so, generate link for it
        const info = clipboardShapeSerializer.deserialize(text);
        const link = generateShapeLink(
          options.sheetId,
          info.shapes.map((s) => s.id),
        );
        return {
          delta: [
            { retain: getOutputCursor() },
            { retain: selection, attributes: { ...LINK_STYLE_ATTRS, link: link } },
          ],
          cursor: getCursor(),
          selection: getSelection(),
        };
      } catch {
        return pasteAsPlain();
      }
    }

    const ret: DocDelta = [{ retain: getOutputCursor() }];

    const outputSelection = getOutputSelection();
    if (outputSelection > 0) {
      ret.push({ delete: outputSelection });
    }

    const attrInfo = mergeDocAttrInfo(getCurrentAttributeInfo());
    const outputs = applyAttrInfoToDocOutput(pasted, attrInfo);
    ret.push(...outputs);

    if (_isDocEmpty) {
      ret.push(getInitialOutput()[0]);
    }

    return {
      delta: ret,
      cursor: getCursor() + getDocLength(pasted),
      selection: 0,
    };
  }

  function getDeltaByInputForPlainText(text: string, options?: TextEditorInputOptions): [DocDelta, nextCursor: number] {
    const cursor = getCursor();
    const inputLength = textEditorUtil.splitToSegments(text).length;
    let nextCursor = cursor + inputLength;
    const ret: DocDelta = [{ retain: getOutputCursor() }];

    const outputSelection = getOutputSelection();
    if (outputSelection > 0) {
      ret.push({ delete: outputSelection });
    }

    const attrs = mergeDocAttrInfo(getCurrentAttributeInfo());
    ret.push(...textEditorUtil.convertRawTextToDoc(text, attrs));

    if (options?.shift && attrs?.list && isLinebreak(text)) {
      // "shift + Enter" breaks the list line without adding a list marker
      // => Set the list type to "empty"
      const lineEndIndexRaw = getRawCursor(_composition, getLineEndIndex(_composition, cursor + getSelection()));
      ret.push(
        { retain: lineEndIndexRaw - getOutputCursor() - outputSelection },
        { retain: 1, attributes: { list: "empty" } },
      );
    }

    if (_isDocEmpty) {
      ret.push(getInitialOutput()[0]);
    }

    return [ret, nextCursor];
  }

  function getDeltaByInputForSpace(text: string, options?: TextEditorInputOptions): [DocDelta, nextCursor: number] {
    if (options?.shift && options.listDetection === "auto") return getDeltaByInputForPlainText(text, options);
    if (!options?.shift && options?.listDetection === "shift") return getDeltaByInputForPlainText(text, options);

    // Get current line content to check for list patterns
    const cursor = getCursor();
    const location = getCursorLocation(_compositionLines, cursor);
    const currentLine = _compositionLines[location.y];
    if (!currentLine) return getDeltaByInputForPlainText(text, options);

    // Check for list pattern
    const currentLineText = textEditorUtil.getLineTextUpToX(currentLine, location.x);
    const potentialListText = currentLineText + text;
    const detection = textEditorUtil.detectListFormatting(potentialListText);
    if (!detection) return getDeltaByInputForPlainText(text, options);

    const lineHeadIndexRaw = getRawCursor(_composition, getLineHeadIndex(_composition, cursor));
    const rawCursor = getOutputCursor();
    const rawSelection = getOutputSelection();
    const rawCursorEnd = rawCursor + rawSelection;

    // Next cursor is at the head of the line
    const nextCursor = cursor - location.x;

    // Remove from the top of the line to the selection end
    // => This will remove the prefix of the list marker as well.
    const ret: DocDelta = [{ retain: lineHeadIndexRaw }, { delete: rawCursorEnd - lineHeadIndexRaw }];

    const blockAttrs = getCurrentAttributeInfo().block;
    const indent = textEditorUtil.getNextListIndent(blockAttrs, detection.type);

    // Apply list style
    const selection = getSelection();
    const lineEndIndexRaw = getRawCursor(_composition, getLineEndIndex(_composition, cursor + selection));
    ret.push({ retain: lineEndIndexRaw - rawCursorEnd }, { retain: 1, attributes: { list: detection.type, indent } });
    return [ret, nextCursor];
  }

  function getDeltaByInputForLineBreak(text: string, options?: TextEditorInputOptions): [DocDelta, nextCursor: number] {
    const selection = getSelection();
    if (options?.shift || selection > 0) return getDeltaByInputForPlainText(text, options);

    const blockAttrs = getCurrentAttributeInfo().block;
    if (!blockAttrs?.list) return getDeltaByInputForPlainText(text, options);

    const cursor = getCursor();
    const location = getCursorLocation(_compositionLines, cursor);
    if (location.x > 0) return getDeltaByInputForPlainText(text, options);

    const currentLine = _compositionLines[location.y];
    if (!currentLine) return getDeltaByInputForPlainText(text, options);

    const hasLineText = !!textEditorUtil.getLineTextUpToX(currentLine, location.x + 1);
    if (hasLineText) return getDeltaByInputForPlainText(text, options);

    // Clear list style
    return [
      getDeltaByApplyBlockStyle(_composition, cursor, getOutputSelection(), { list: null, indent: null }),
      cursor,
    ];
  }

  function getDeltaAndCursorByRemoval(deleteKey = false): { delta: DocDelta; cursor: number } {
    if (_isDocEmpty) return { delta: getInitialOutput(), cursor: 0 };

    const cursor = getCursor();
    const selection = getSelection();
    const getPlainResult = () => {
      if (deleteKey) {
        return textEditorUtil.getDeltaAndCursorByDelete(
          { composition: _composition, lines: _compositionLines },
          docLength,
          cursor,
          selection,
        );
      } else {
        return textEditorUtil.getDeltaAndCursorByBackspace(
          { composition: _composition, lines: _compositionLines },
          cursor,
          selection,
        );
      }
    };

    const location = getCursorLocation(_compositionLines, cursor);
    if (location.x !== 0 || selection > 0) return getPlainResult();

    const blockAttrs = getCurrentAttributeInfo().block;
    if (!blockAttrs?.list) return getPlainResult();

    // The deletion should be intended for clearing list style.
    return {
      delta: textEditorUtil.getDeltaByApplyBlockStyle(
        _composition,
        cursor,
        0,
        blockAttrs.indent === 0 || blockAttrs.list === "empty"
          ? { list: null, indent: null } // Clear list style when it's top level or has no list marker
          : { ...blockAttrs, list: "empty" }, // Set empty otherwise
      ),
      cursor,
    };
  }

  function getDeltaAndCursorByBackspace(): { delta: DocDelta; cursor: number } {
    return getDeltaAndCursorByRemoval();
  }

  function getDeltaAndCursorByDelete(): { delta: DocDelta; cursor: number } {
    return getDeltaAndCursorByRemoval(true);
  }

  function getDeltaByApplyInlineStyle(attrs: DocAttributes): DocDelta {
    if (_isDocEmpty) return getInitialOutput(attrs);

    const cursor = getCursor();
    const selection = getSelection();

    // When the selection reaches the doc end, apply the style to the line break at the doc end.
    // => Otherwise, there's no way to change inline style of it but changing whole doc style.
    const lastSelected = cursor + selection === docLength - 1;

    const outputCursor = getOutputCursor();
    const outputSelection = getOutputSelection() + (lastSelected ? 1 : 0);

    if (outputSelection === 0) return [];
    return [{ retain: outputCursor }, { retain: outputSelection, attributes: attrs }];
  }

  function _getDeltaByApplyBlockStyle(attrs: DocAttributes): DocDelta {
    if (_isDocEmpty) return getInitialOutput(attrs);

    const cursor = getCursor();
    const selection = getSelection();
    return getDeltaByApplyBlockStyle(_composition, cursor, selection, attrs);
  }

  function getDeltaByApplyDocStyle(attrs: DocAttributes): DocDelta {
    if (_isDocEmpty) return getInitialOutput(attrs);
    return [{ retain: outputLength - 1 }, { retain: 1, attributes: attrs }];
  }

  // List operations
  function getDeltaByToggleList(listType: "bullet" | "ordered" | null): DocDelta {
    if (_isDocEmpty) return getInitialOutput({ list: listType, indent: listType ? 0 : null });

    const cursor = getCursor();
    const selection = getSelection();
    const currentInfo = getCurrentAttributeInfo();
    const currentListType = currentInfo.block?.list;

    // If toggling off the same list type, remove list formatting
    if (currentListType === listType) {
      return getDeltaByApplyBlockStyle(_composition, cursor, selection, { list: null, indent: null });
    }

    // If switching list types or adding new list, apply the new list type
    const indent = currentInfo.block?.indent ?? 0;
    return getDeltaByApplyBlockStyle(_composition, cursor, selection, { list: listType, indent });
  }

  function getDeltaByChangeIndent(val = 1): DocDelta {
    if (_isDocEmpty || val === 0) return [];

    const currentInfo = getCurrentAttributeInfo();
    const listType = currentInfo.block?.list;
    if (!listType && val < 0) return [];

    const cursor = getCursor();
    const selection = getSelection();

    if (!listType && 0 < val) {
      // Make empty list with the indent when it's a plain line
      return getDeltaByApplyBlockStyle(_composition, cursor, selection, { list: "empty", indent: val - 1 });
    }

    const currentIndent = currentInfo.block?.indent ?? 0;
    if (currentIndent === 0 && val < 0)
      return getDeltaByApplyBlockStyle(_composition, cursor, selection, { list: null, indent: null });

    const newIndent = Math.max(currentIndent + Math.round(val), 0);
    return getDeltaByApplyBlockStyle(_composition, cursor, selection, { indent: newIndent });
  }

  function getDeltaByInput(text: string, options?: TextEditorInputOptions): [DocDelta, nextCursor: number] {
    if (isLinebreak(text)) return getDeltaByInputForLineBreak(text, options);
    if (textEditorUtil.isBlockMarkerTrigger(text)) return getDeltaByInputForSpace(text, options);
    return getDeltaByInputForPlainText(text, options);
  }

  function copyPlainText(): string {
    return textEditorUtil.copyPlainText(_compositionLines, getCursor(), getSelection());
  }

  function getBoundsAtIME(): IRectangle | undefined {
    if (!_composition || !_compositionLines) return;
    return getBoundsAtLocation(
      _composition,
      _compositionLines,
      getCursorLocation(_compositionLines, getCursor() + getSelection()),
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

  function render(ctx: CanvasCTX) {
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

    getDeltaAndCursorByBackspace,
    getDeltaAndCursorByDelete,
    getCurrentAttributeInfo,
    getDeltaByApplyInlineStyle,
    getDeltaByApplyBlockStyle: _getDeltaByApplyBlockStyle,
    getDeltaByApplyDocStyle,

    // List operations
    getDeltaByToggleList,
    getDeltaByChangeIndent,
    getDeltaByInput,

    copyPlainText,
    getLocationAt,
    isInDoc,
    getBoundsAtIME,
    startIME,
    stopIME,
    render,

    watchCursor: cursorCallback.bind,
  };
}
export type TextEditorController = ReturnType<typeof newTextEditorController>;

function renderSelection(
  ctx: CanvasCTX,
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
  },
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
  ctx: CanvasCTX,
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
  },
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

      const cs = composition[Math.max(0, cursor + selection - 1)];
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
