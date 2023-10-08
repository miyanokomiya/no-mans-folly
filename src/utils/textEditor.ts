import { IRectangle, IVec2 } from "okageo";
import { DocAttrInfo, DocAttributes, DocDelta, DocDeltaInsert, DocOutput } from "../models/document";
import { Size } from "../models";
import { applyDefaultStrokeStyle } from "./strokeStyle";

export const DEFAULT_FONT_SIZE = 18;
export const DEFAULT_LINEHEIGHT = 1.2;

const WORDBREAK = /\n| |\t|\.|,/;
export const LINEBREAK = /\n|\r\n/;

export interface DocCompositionItem {
  char: string; // A grapheme character
  bounds: IRectangle;
}

export interface DocCompositionLine {
  y: number;
  // refers line's height
  height: number;
  // refers font's height
  // When this is smaller than "height", this line has extra padding and its content needs to be centralized.
  fontheight: number;
  outputs: DocOutput;
}

/**
 * A letter refers to a graphme
 */
type WordItem = [letter: string, width: number, attrs?: DocAttributes][];
type LineItem = WordItem[];
type BlockItem = [lines: LineItem[], attrs?: DocAttributes];

/**
 * "char" must be a character.
 */
function isWordbreak(char: string): boolean {
  return WORDBREAK.test(char);
}

/**
 * "char" must be a character.
 */
export function isLinebreak(char: string): boolean {
  return LINEBREAK.test(char);
}

const segmenter = new (Intl as any).Segmenter();

/**
 * Returns text segments based on graphemes
 */
export function splitToSegments(text: string): string[] {
  return [...segmenter.segment(text)].map((s) => s.segment);
}

/**
 * Returns doc length based on graphemes
 */
export function getDocLength(doc: DocOutput): number {
  return doc.map((d) => splitToSegments(d.insert)).reduce((p, v) => p + v.length, 0);
}

/**
 * Returns doc length based on doc delta
 */
export function getDocRawLength(doc: DocOutput): number {
  return doc.map((d) => d.insert).reduce((p, v) => p + v.length, 0);
}

export function renderDoc(ctx: CanvasRenderingContext2D, doc: DocOutput, range: IRectangle) {
  const info = getDocCompositionInfo(doc, ctx, range.width, range.height);
  const lines = info.lines;
  const composition = info.composition;
  renderDocByComposition(ctx, composition, lines);
}

export function renderDocByComposition(
  ctx: CanvasRenderingContext2D,
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
) {
  let index = 0;
  compositionLines.forEach((line) => {
    if (index === composition.length) return;

    const lineTop = line.y;
    const lineHeight = line.height;
    const fontPadding = (line.height - line.fontheight) / 2;
    const fontTop = lineTop + fontPadding;
    const fontHeight = line.fontheight;

    line.outputs.forEach((op) => {
      const lineComposition = composition[index];

      if (op.attributes?.background) {
        ctx.fillStyle = op.attributes.background;
        ctx.beginPath();
        ctx.fillRect(lineComposition.bounds.x, lineTop, lineComposition.bounds.width, lineHeight);
      }

      if (op.attributes?.underline || op.attributes?.strike) {
        applyDefaultStrokeStyle(ctx);
        if (op.attributes.color) {
          ctx.strokeStyle = op.attributes.color;
        }
        ctx.lineWidth = fontHeight * 0.07;
      }

      if (op.attributes?.underline) {
        ctx.beginPath();
        ctx.moveTo(lineComposition.bounds.x, fontTop + fontHeight * 0.9);
        ctx.lineTo(lineComposition.bounds.x + lineComposition.bounds.width, fontTop + fontHeight * 0.9);
        ctx.stroke();
      }

      applyDocAttributesToCtx(ctx, op.attributes);
      // TODO: "0.8" isn't after any rule or theory but just a seem-good value for locating letters to the center.
      ctx.fillText(op.insert, lineComposition.bounds.x, fontTop + fontHeight * 0.8);

      if (op.attributes?.strike) {
        ctx.beginPath();
        ctx.moveTo(lineComposition.bounds.x, fontTop + fontHeight * 0.5);
        ctx.lineTo(lineComposition.bounds.x + lineComposition.bounds.width, fontTop + fontHeight * 0.5);
        ctx.stroke();
      }

      index += splitToSegments(op.insert).length;
    });
  });

  // For debug
  composition.forEach((c) => {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.strokeRect(c.bounds.x, c.bounds.y, c.bounds.width, c.bounds.height);
  });
}

export function getRawCursor(composition: DocCompositionItem[], cursor: number): number {
  return composition.slice(0, cursor).reduce((m, item) => {
    return m + item.char.length;
  }, 0);
}

export function getCursorLocation(compositionLines: DocCompositionLine[], cursor: number): IVec2 {
  let x = 0;
  let y = 0;
  let count = 0;

  compositionLines.some((line, i) => {
    const length = getLineLength(line);
    if (count + length === cursor) {
      if (i === compositionLines.length - 1) {
        x = length;
      } else {
        x = 0;
        y += 1;
      }
      return true;
    } else if (count + length < cursor) {
      x = 0;
      y += 1;
      count += length;
      return;
    } else {
      x = cursor - count;
      return true;
    }
  });

  return { x, y };
}

export function applyDocAttributesToCtx(ctx: CanvasRenderingContext2D, attrs: DocAttributes = {}): void {
  const fontSize = attrs.size ?? DEFAULT_FONT_SIZE;
  const fontFamily = attrs.font ?? "Arial";
  const fontDecoration = [attrs.bold ? "bold" : "", attrs.italic ? "italic" : ""].join(" ");
  const color = attrs.color ?? "#000";

  ctx.font = `${fontDecoration} ${fontSize}px ${fontFamily}`;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

export function getLineHeight(attrs: DocAttributes = {}, blockAttrs: DocAttributes = {}): number {
  const fontSize = attrs.size ?? DEFAULT_FONT_SIZE;
  const lineheight = blockAttrs.lineheight ?? DEFAULT_LINEHEIGHT;
  return fontSize * lineheight;
}

export function getBreakLineIndexWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  marginToTail: number,
): number | undefined {
  const width = ctx.measureText(word).width;
  if (width >= marginToTail) {
    for (let i = 1; i <= word.length; i++) {
      const w = ctx.measureText(word.slice(0, i)).width;
      if (w >= marginToTail) {
        return i - 1;
      }
    }
  }

  return;
}

export function getBreakIndicesForWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  marginToTail: number,
  lineWidth: number,
): number[] | undefined {
  const indexForTop = getBreakLineIndexWord(ctx, word, marginToTail);
  if (indexForTop === undefined) return;

  const ret = [indexForTop];
  let remainWord = word.slice(indexForTop);
  let sum = indexForTop;
  while (remainWord) {
    const index = getBreakLineIndexWord(ctx, remainWord, lineWidth);
    if (index) {
      ret.push(sum + index);
      remainWord = remainWord.slice(index);
      sum += index;
    } else {
      remainWord = "";
    }
  }

  return ret;
}

export function getCursorLocationAt(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  p: IVec2,
): IVec2 {
  let lineIndex = 0;
  compositionLines.some((line) => {
    if (p.y < line.y + line.height) return true;
    lineIndex += 1;
  });

  lineIndex = Math.min(Math.max(lineIndex, 0), compositionLines.length - 1);
  const charIndex = compositionLines.slice(0, lineIndex).reduce((n, line) => {
    return n + getLineLength(line);
  }, 0);
  const lengthInLine = getLineLength(compositionLines[lineIndex]);
  const compositionInLine = composition.slice(charIndex, charIndex + lengthInLine);

  let xIndex = 0;
  // Omit the line break to keep the cursor in the line.
  // => When the cursor is after line break, it means the cursor is in the next line.
  for (let i = 0; i < compositionInLine.length - 1; i++) {
    const c = compositionInLine[i];
    if (p.x < c.bounds.x + c.bounds.width / 2) break;
    xIndex += 1;
  }

  xIndex = Math.min(Math.max(xIndex, 0), compositionInLine.length);
  return { x: xIndex, y: lineIndex };
}

export function isCursorInDoc(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  p: IVec2,
): boolean {
  if (
    compositionLines.length === 0 ||
    p.y < compositionLines[0].y ||
    compositionLines[compositionLines.length - 1].y + compositionLines[compositionLines.length - 1].height < p.y
  )
    return false;

  const lineIndex = compositionLines.findIndex((line) => {
    return p.y <= line.y + line.height;
  });

  const charIndex = compositionLines.slice(0, lineIndex).reduce((n, line) => {
    return n + getLineLength(line);
  }, 0);
  const lengthInLine = getLineLength(compositionLines[lineIndex]);
  const compositionInLine = composition.slice(charIndex, charIndex + lengthInLine);

  return compositionInLine.some((c) => {
    return c.bounds.x <= p.x && p.x <= c.bounds.x + c.bounds.width;
  });
}

export function getBoundsAtLocation(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  location: IVec2,
): IRectangle {
  if (composition.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const charIndex =
    compositionLines.slice(0, location.y).reduce((n, line) => {
      return n + getLineLength(line);
    }, 0) + location.x;

  if (charIndex < composition.length) {
    const com = composition[charIndex];
    return com.bounds;
  } else {
    const com = composition[composition.length - 1];
    return {
      x: com.bounds.x + com.bounds.width,
      y: com.bounds.y,
      width: 0,
      height: com.bounds.height,
    };
  }
}

export function getRangeLines(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  [cursor, length]: [cursor: number, length: number],
): DocCompositionItem[][] {
  const cursorTo = Math.min(cursor + length, composition.length);
  const from = getCursorLocation(compositionLines, cursor);
  const to = getCursorLocation(compositionLines, cursorTo);

  if (from.y === to.y) {
    return from.x === to.x ? [] : [composition.slice(cursor, cursorTo)];
  }

  const ret: [number, number][] = [[cursor, getLineLength(compositionLines[from.y]) - from.x]];
  let count = ret[0][0] + ret[0][1];
  for (let i = from.y + 1; i < to.y; i++) {
    const l = getLineLength(compositionLines[i]);
    ret.push([count, l]);
    count += l;
  }
  ret.push([count, to.x]);
  return ret.map((val) => composition.slice(val[0], val[0] + val[1]));
}

export function getLineLength(line: DocCompositionLine): number {
  return line.outputs.reduce((n, o) => n + splitToSegments(o.insert).length, 0);
}

/**
 * Return index at the linebreak of the target line
 * => This index is at the left hand side of a linebreak.
 */
export function getLineEndIndex(composition: DocCompositionItem[], cursor: number): number {
  for (let i = cursor; i < composition.length; i++) {
    const c = composition[i];
    if (isLinebreak(c.char)) {
      return i;
    }
  }
  return composition.length - 1;
}

/**
 * Return index at the linebreak of the previous line + 1
 * => This index is at the right hand side of a linebreak.
 */
export function getLineHeadIndex(composition: DocCompositionItem[], cursor: number): number {
  for (let i = cursor - 1; 0 <= i; i--) {
    const c = composition[i];
    if (isLinebreak(c.char)) {
      return i + 1;
    }
  }
  return 0;
}

export function getDeltaByApplyBlockStyle(
  composition: DocCompositionItem[],
  cursor: number,
  selection: number,
  attrs: DocAttributes,
): DocDelta {
  const breakIndexList: number[] = [];
  for (let i = cursor; i < composition.length; i++) {
    const c = composition[i];
    if (isLinebreak(c.char)) {
      breakIndexList.push(i);
      if (cursor + selection <= i) break;
    }
  }

  return getDeltaByApplyAttrsTo(breakIndexList, attrs);
}

export function getDeltaByApplyBlockStyleToDoc(doc: DocOutput, attrs: DocAttributes): DocDelta {
  if (doc.length === 0) return getInitialOutput(attrs);

  const breakIndexList: number[] = [];

  let cursor = 0;
  doc.forEach((o) => {
    for (let i = 0; i < o.insert.length; i++) {
      if (isLinebreak(o.insert[i])) {
        breakIndexList.push(cursor);
      }
      cursor += 1;
    }
  });

  return getDeltaByApplyAttrsTo(breakIndexList, attrs);
}

function getDeltaByApplyAttrsTo(targetIndexList: number[], attrs: DocAttributes): DocDelta {
  if (targetIndexList.length === 0) return [];
  const ret: DocDelta = [];
  let tmp = 0;
  for (let i = 0; i < targetIndexList.length; i++) {
    const breakIndex = targetIndexList[i];
    if (breakIndex - tmp > 0) {
      ret.push({ retain: breakIndex - tmp });
    }
    ret.push({ retain: 1, attributes: attrs });
    tmp = breakIndex + 1;
  }
  return ret;
}

export function getDeltaByApplyDocStyle(doc: DocOutput, attrs: DocAttributes): DocDelta {
  if (doc.length === 0) return getInitialOutput(attrs);

  const retain = doc.reduce((n, o) => n + o.insert.length, 0) - 1;
  return [{ retain }, { retain: 1, attributes: attrs }];
}

export function getDeltaByApplyInlineStyleToDoc(doc: DocOutput, attrs: DocAttributes): DocDelta {
  if (doc.length === 0) return getInitialOutput(attrs);

  const retain = doc.reduce((n, o) => n + o.insert.length, 0);
  return [{ retain, attributes: attrs }];
}

export function getOutputAt(line: DocCompositionLine, x: number): DocDeltaInsert {
  let count = 0;
  let ret = line.outputs[line.outputs.length - 1];
  line.outputs.some((o) => {
    count += splitToSegments(o.insert).length;
    if (x <= count) {
      ret = o;
      return true;
    }
  });
  return ret;
}

export function getInitialOutput(attrs: DocAttributes = {}): DocOutput {
  return [{ insert: "\n", attributes: { direction: "middle", align: "center", ...attrs } }];
}

// The last output represents a doc's attributes
export function getDocAttributes(doc: DocOutput): DocAttributes | undefined {
  return doc.length === 0 ? getInitialOutput()[0].attributes : doc[doc.length - 1].attributes;
}

export function mergeDocAttrInfo(info: DocAttrInfo): DocAttributes | undefined {
  if (!info.cursor && !info.block && !info.doc) return;

  // priority: doc < block < inline
  const ret = { ...(info.doc ?? {}), ...(info.block ?? {}), ...(info.cursor ?? {}) };

  // block specific
  if (info?.block?.align) ret.align = info.block.align;

  // doc specific
  if (info?.doc?.direction) ret.direction = info.doc.direction;

  return ret;
}

export function sliceDocOutput(doc: DocOutput, from: number, to: number): DocOutput {
  const ret: DocOutput = [];

  let count = 0;
  for (let i = 0; i < doc.length; i++) {
    const o = doc[i];
    const segments = splitToSegments(o.insert);
    const nextCount = count + segments.length;

    if (nextCount <= from) {
      count = nextCount;
      continue;
    }

    if (count <= from && from < nextCount) {
      if (nextCount < to) {
        ret.push({ ...o, insert: segments.slice(from - count, o.insert.length).join("") });
        count = nextCount;
        continue;
      } else {
        ret.push({ ...o, insert: segments.slice(from - count, to - count).join("") });
        break;
      }
    } else {
      if (nextCount < to) {
        ret.push({ ...o, insert: o.insert });
        count = nextCount;
        continue;
      } else {
        ret.push({ ...o, insert: segments.slice(0, to - count).join("") });
        break;
      }
    }
  }

  return ret;
}

export function splitDocOutputByLineBreak(doc: DocOutput): DocOutput {
  const splited: DocOutput = [];

  doc.forEach((p) => {
    const create = () => (p.attributes ? { attributes: p.attributes } : {});
    const [head, ...body] = p.insert.split(LINEBREAK);
    if (head) splited.push({ insert: head, ...create() });
    body.forEach((l) => {
      splited.push({ insert: "\n", ...create() });
      if (l) splited.push({ insert: l, ...create() });
    });
  });

  return splited;
}

export function applyAttrInfoToDocOutput(pasted: DocOutput, attrs?: DocAttributes): DocOutput {
  const splited = splitDocOutputByLineBreak(pasted);
  return attrs ? splited.map((d) => ({ ...d, attributes: { ...attrs, ...(d.attributes ?? {}) } })) : splited;
}

/**
 * Letters are split into units based on graphemes
 */
export function getDocLetterWidthMap(doc: DocOutput, ctx: CanvasRenderingContext2D): Map<number, number> {
  const ret = new Map<number, number>();

  let cursor = 0;
  doc.forEach((op) => {
    applyDocAttributesToCtx(ctx, op.attributes);

    const segments = splitToSegments(op.insert);
    for (let i = 0; i < segments.length; i++) {
      const c = segments[i];
      if (isLinebreak(c)) {
        ret.set(cursor, 0);
      } else {
        ret.set(cursor, ctx.measureText(c).width);
      }
      cursor += 1;
    }
  });

  return ret;
}

function isMultiByte(c: string) {
  const p = c.codePointAt(0);
  return p ? p > 255 : true;
}

export function splitOutputsIntoLineWord(doc: DocOutput, widthMap?: Map<number, number>): WordItem[][] {
  const lines: WordItem[][] = [];
  let line: WordItem[] = [];
  let word: WordItem = [];
  let cursor = 0;

  const getW = () => {
    return widthMap?.get(cursor) ?? 0;
  };

  doc.forEach((op) => {
    const segList = splitToSegments(op.insert);
    for (let i = 0; i < segList.length; i++) {
      const c = segList[i];

      if (isLinebreak(c)) {
        if (word.length > 0) line.push(word);
        line.push([[c, getW(), op.attributes]]);
        lines.push(line);
        word = [];
        line = [];
      } else if (isWordbreak(c)) {
        if (word.length > 0) line.push(word);
        line.push([[c, getW(), op.attributes]]);
        word = [];
      } else if (isMultiByte(c)) {
        if (word.length > 0) line.push(word);
        line.push([[c, getW(), op.attributes]]);
        word = [];
      } else {
        word.push([c, getW(), op.attributes]);
      }

      cursor += 1;
    }
  });

  return lines;
}

export function applyRangeWidthToLineWord(lineWord: WordItem[][], rangeWidth: number): BlockItem[] {
  const blocks: BlockItem[] = [];
  let lines: LineItem[] = [];
  let line: LineItem = [];
  let word: WordItem = [];

  lineWord.forEach((lineUnit) => {
    let left = 0;

    lineUnit.forEach((wordUnit, wordIndex) => {
      let broken = false;

      wordUnit.forEach((unit) => {
        if (isLinebreak(unit[0])) {
          if (word.length > 0) line.push(word);
          line.push([unit]);
          lines.push(line);
          blocks.push([lines, unit[2]]);
          word = [];
          line = [];
          lines = [];
          return;
        }

        if (left + unit[1] < rangeWidth) {
          word.push(unit);
          left += unit[1];
        } else {
          if (broken || wordIndex === 0) {
            // This word must be longer than the range width
            // => Break it into some parts
            line.push(word);
            lines.push(line);
            line = [];
            word = [unit];
            left = unit[1];
          } else {
            // Place the word in the next line
            lines.push(line);
            line = [];
            word.push(unit);
            left = word.reduce((p, u) => p + u[1], 0);
          }

          broken = true;
        }
      });

      if (word.length > 0) line.push(word);
      word = [];
    });

    if (line.length > 0) lines.push(line);
    line = [];
    word = [];
  });

  return blocks;
}

export function convertLineWordToComposition(
  blockLineWord: BlockItem[],
  rangeWidth: number,
  rangeHeight: number,
): {
  composition: DocCompositionItem[];
  lines: DocCompositionLine[];
} {
  if (blockLineWord.length === 0) {
    return {
      composition: [],
      lines: [],
    };
  }

  const lastBlock = blockLineWord[blockLineWord.length - 1];
  const docAttrs = lastBlock[1];

  const heightList: [height: number, fontheight: number][] = [];
  let docHeight = 0;
  {
    blockLineWord.forEach(([lineWord, blockAttrs]) => {
      lineWord.forEach((lineUnit) => {
        let height = 0;
        let fontheight = 0;
        lineUnit.forEach((wordUnit) =>
          wordUnit.forEach((unit) => {
            const h = getLineHeight(unit[2], blockAttrs);
            if (height < h) {
              height = h;
              fontheight = unit[2]?.size ?? DEFAULT_FONT_SIZE;
            }
          }),
        );
        docHeight += height;
        heightList.push([height, fontheight]);
      });
    });
  }

  const yMargin = (rangeHeight - docHeight) * getDirectionGapRate(docAttrs);
  const lines: DocCompositionLine[] = [];
  {
    let y = yMargin;
    let lineIndex = 0;
    blockLineWord.forEach(([lineWord]) => {
      lineWord.forEach((lineUnit) => {
        const outputs: DocOutput = [];
        const [height, fontheight] = heightList[lineIndex];
        lineUnit.forEach((wordUnit) =>
          wordUnit.forEach((unit) => {
            outputs.push({ insert: unit[0], attributes: unit[2] });
          }),
        );

        lines.push({ y, height, fontheight, outputs });
        y += height;
        lineIndex += 1;
      });
    });
  }

  const composition: DocCompositionItem[] = [];
  {
    let lineIndex = 0;
    blockLineWord.forEach(([lineWord, blockAttrs]) => {
      lineWord.forEach((lineUnit) => {
        const line = lines[lineIndex];
        const y = line.y;
        const height = line.height;
        const lineWidth = lineUnit.reduce((n, w) => n + w.reduce((m, u) => m + u[1], 0), 0);
        const xMargin = (rangeWidth - lineWidth) * getAlignGapRate(blockAttrs);

        let x = xMargin;
        lineUnit.forEach((wordUnit) =>
          wordUnit.forEach((unit) => {
            composition.push({ char: unit[0], bounds: { x, y, width: unit[1], height } });
            x += unit[1];
          }),
        );
        lineIndex += 1;
      });
    });
  }

  return { lines, composition };
}

function getAlignGapRate(attrs?: DocAttributes): number {
  switch (attrs?.align) {
    case "right":
      return 1;
    case "center":
      return 0.5;
    default:
      return 0;
  }
}

function getDirectionGapRate(attrs?: DocAttributes): number {
  switch (attrs?.direction) {
    case "bottom":
      return 1;
    case "middle":
      return 0.5;
    default:
      return 0;
  }
}

export function getDocCompositionInfo(
  doc: DocOutput,
  ctx: CanvasRenderingContext2D,
  rangeWidth: number,
  rangeHeight: number,
): {
  composition: DocCompositionItem[];
  lines: DocCompositionLine[];
} {
  return convertLineWordToComposition(
    applyRangeWidthToLineWord(splitOutputsIntoLineWord(doc, getDocLetterWidthMap(doc, ctx)), rangeWidth),
    rangeWidth,
    rangeHeight,
  );
}

export function getWordRangeAtCursor(
  composition: Pick<DocCompositionItem, "char">[],
  cursor: number,
): [cursor: number, selection: number] {
  // Avoid selecting while space characters
  if (isWordbreak(composition[cursor].char)) return [cursor, 0];

  let from = 0;
  for (let i = cursor - 1; 0 <= i; i--) {
    const c = composition[i];
    if (isWordbreak(c.char)) {
      from = i + 1;
      break;
    }
  }

  let to = composition.length;
  for (let i = cursor + 1; i < composition.length; i++) {
    const c = composition[i];
    if (isWordbreak(c.char)) {
      to = i;
      break;
    }
  }

  return [from, to - from];
}

export function calcOriginalDocSize(doc: DocOutput, ctx: CanvasRenderingContext2D, rangeWidth: number): Size {
  const adjustedDoc = doc.length === 0 ? getInitialOutput() : doc;
  const blocks = applyRangeWidthToLineWord(
    splitOutputsIntoLineWord(adjustedDoc, getDocLetterWidthMap(adjustedDoc, ctx)),
    rangeWidth,
  );
  const info = convertLineWordToComposition(blocks, rangeWidth, 1);
  const height = info.lines.reduce((p, l) => p + l.height, 0);

  let width = 1;
  blocks.some(([lines]) => {
    lines.some((line) => {
      const lineWidth = line.reduce((p, words) => p + words.reduce((q, [, w]) => q + w, 0), 0);
      width = Math.max(width, Math.ceil(lineWidth));

      return width >= rangeWidth;
    });

    return width >= rangeWidth;
  });
  return { width, height };
}
