import { IRectangle, IVec2 } from "okageo";
import { DocAttrInfo, DocAttributes, DocDelta, DocDeltaInsert, DocOutput } from "../models/document";
import { Size } from "../models";
import { applyDefaultStrokeStyle } from "./strokeStyle";
import { newChronoCache } from "./stateful/cache";
import { SVGElementInfo, getColorAttributes } from "./svgElements";
import { toHexAndAlpha } from "./color";
import { CanvasCTX } from "./types";

export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_LINEHEIGHT = 1.2;

const WORDBREAK = /\n|\t|[ -/]|[:-@]|[[-`]/;
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

export interface DocCompositionInfo {
  composition: DocCompositionItem[];
  lines: DocCompositionLine[];
}

/**
 * A letter refers to a graphme
 */
type WordItem = [letter: string, width: number, attrs?: DocAttributes][];
type LineItem = WordItem[];
type BlockItem = [lines: LineItem[], attrs?: DocAttributes];

export const LINK_STYLE_ATTRS: DocAttributes = { underline: true, color: "#3b82f6" };

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

const URL_TEXT_REG = /https?:\/\/[^\s]+/;
const URL_TEXT_EXACT_REG = /^https?:\/\/[^\s]+/;
export function isUrlText(text: string, exact = false): boolean {
  return (exact ? URL_TEXT_EXACT_REG : URL_TEXT_REG).test(text);
}

export function splitTextByURL(text: string): { val: string; isUrl: boolean }[] {
  const items = text.split(/(https?:\/\/[^\s]+)/);
  return items.filter((val) => val !== "").map((val) => ({ val, isUrl: URL_TEXT_REG.test(val) }));
}

/**
 * Returned doc doesn't have a line break at the end.
 * => Make sure to put the line break if you want to make it a complete doc.
 */
export function convertRawTextToDoc(text: string, defaultAttrs?: DocAttributes): DocOutput {
  const ret: DocOutput = [];
  const list = text.split(LINEBREAK);
  list.forEach((block, i) => {
    if (block) {
      splitTextByURL(block).forEach((item) => {
        ret.push({
          insert: item.val,
          attributes: item.isUrl ? { ...defaultAttrs, ...LINK_STYLE_ATTRS, link: item.val } : defaultAttrs,
        });
      });
    }
    if (i !== list.length - 1) {
      ret.push({ insert: "\n", attributes: defaultAttrs });
    }
  });
  return ret;
}

const segmenter = new (Intl as any).Segmenter();
const segmenterCache = newChronoCache<string, string[]>({ duration: 30000, getTimestamp: Date.now });

/**
 * Returns text segments based on graphemes
 */
export function splitToSegments(text: string): string[] {
  const cache = segmenterCache.getValue(text);
  if (cache) return cache;

  const value = [...segmenter.segment(text)].map((s) => s.segment);
  segmenterCache.setValue(text, value);
  return value;
}

/**
 * Returns doc length based on graphemes
 */
export function getDocLength(doc: DocOutput): number {
  return doc.map((d) => splitToSegments(d.insert)).reduce((p, v) => p + v.length, 0);
}

/**
 * Returns true when doc has no content.
 * i.e. There's no items or only one line break.
 */
export function hasDocNoContent(doc: DocOutput): boolean {
  if (doc.length === 0) return true;
  return doc.length === 1 && doc[0].insert.length === 1 && isLinebreak(doc[0].insert);
}

/**
 * Returns doc length based on doc delta
 */
export function getDocRawLength(doc: DocOutput): number {
  return doc.map((d) => d.insert).reduce((p, v) => p + v.length, 0);
}

export function renderDoc(ctx: CanvasCTX, doc: DocOutput, range: IRectangle) {
  const info = getDocCompositionInfo(doc, ctx, range.width, range.height);
  const lines = info.lines;
  const composition = info.composition;
  renderDocByComposition(ctx, composition, lines);
}

const LOD_THRESHOLD = 6;

export function renderDocByComposition(
  ctx: CanvasCTX,
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  scale?: number, // If provided, text may be simplified when the visual size is too small.
) {
  let index = 0;
  let lastAttributes: DocAttributes | undefined;
  applyDocAttributesToCtx(ctx, lastAttributes);

  compositionLines.forEach((line) => {
    if (index >= composition.length) return;

    const lineTop = line.y;
    const lineHeight = line.height;
    const fontPadding = (line.height - line.fontheight) / 2;
    const fontTop = lineTop + fontPadding;
    const fontHeight = line.fontheight;
    const groups = getInlineGroups(
      line,
      (inlineIndex) => composition[index + inlineIndex].bounds,
      (a, b) => a === b, // Make sure to keep the original reference as much as possible.
    );

    groups.forEach((group) => {
      const fontSize = group.attributes.size ?? DEFAULT_FONT_SIZE;
      if (scale !== undefined && fontSize / scale < LOD_THRESHOLD) {
        ctx.fillStyle = group.attributes.color ?? "#000";
        const size = fontSize / 3;
        ctx.beginPath();
        ctx.rect(group.bounds.x, group.bounds.y + (group.bounds.height - size) / 2, group.bounds.width, size);
        ctx.fill();
        return;
      }

      if (group.attributes.background) {
        ctx.fillStyle = group.attributes.background;
        ctx.beginPath();
        ctx.fillRect(group.bounds.x, lineTop, group.bounds.width, lineHeight);
      }

      if (lastAttributes !== group.attributes) {
        applyDocAttributesToCtx(ctx, group.attributes);
        lastAttributes = group.attributes;
      } else {
        // Need to reset fill style for background at least.
        ctx.fillStyle = group.attributes.color ?? "#000";
      }
      // TODO: "0.8" isn't after any rule or theory but just a seem-good value for locating letters to the center.
      ctx.fillText(group.text, group.bounds.x, fontTop + fontHeight * 0.8);

      if (group.attributes.underline || group.attributes.strike) {
        applyDefaultStrokeStyle(ctx);
        ctx.lineWidth = fontHeight * 0.07;
        if (group.attributes.color) {
          ctx.strokeStyle = group.attributes.color;
        }
      }

      if (group.attributes.underline) {
        const y = fontTop + fontHeight * 0.9;
        ctx.beginPath();
        ctx.moveTo(group.bounds.x, y);
        ctx.lineTo(group.bounds.x + group.bounds.width, y);
        ctx.stroke();
      }

      if (group.attributes.strike) {
        const y = fontTop + fontHeight * 0.5;
        ctx.beginPath();
        ctx.moveTo(group.bounds.x, y);
        ctx.lineTo(group.bounds.x + group.bounds.width, y);
        ctx.stroke();
      }

      // For debug
      // ctx.strokeStyle = "red";
      // ctx.beginPath();
      // ctx.strokeRect(group.bounds.x, lineTop, group.bounds.width, lineHeight);
    });

    index += line.outputs.length;
  });

  // For debug
  // composition.forEach((c) => {
  //   ctx.strokeStyle = "red";
  //   ctx.lineWidth = 1;
  //   ctx.strokeRect(c.bounds.x, c.bounds.y, c.bounds.width, c.bounds.height);
  // });
}

/**
 * Follows the same rendering way as "renderDocByComposition".
 */
export function renderSVGDocByComposition(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
): SVGElementInfo {
  const bgElement: SVGElementInfo = { tag: "g", children: [] };
  const textElement: SVGElementInfo = {
    tag: "text",
    attributes: {
      stroke: "none",
      fill: "#000",
      "font-size": DEFAULT_FONT_SIZE,
    },
    children: [],
  };
  const fwElement: SVGElementInfo = { tag: "g", attributes: { stroke: "#000" }, children: [] };
  const rootElement: SVGElementInfo = {
    tag: "g",
    attributes: {
      "alignment-baseline": "alphabetic",
    },
    children: [bgElement, textElement, fwElement],
  };

  let index = 0;
  compositionLines.forEach((line) => {
    if (index === composition.length) return;

    const lineTop = line.y;
    const lineHeight = line.height;
    const fontPadding = (line.height - line.fontheight) / 2;
    const fontTop = lineTop + fontPadding;
    const fontHeight = line.fontheight;
    const groups = getInlineGroups(
      line,
      (inlineIndex) => composition[index + inlineIndex].bounds,
      (a, b) => a === b, // Make sure to keep the original reference as much as possible.
    );

    const lineElement: SVGElementInfo = {
      tag: "tspan",
      attributes: {
        y: fontTop + fontHeight * 0.8,
      },
      children: [],
    };
    textElement.children!.push(lineElement);

    groups.forEach((group) => {
      if (group.attributes.background) {
        bgElement.children?.push({
          tag: "rect",
          attributes: {
            x: group.bounds.x,
            y: group.bounds.y,
            width: group.bounds.width,
            height: lineHeight,
            ...getColorAttributes("fill", toHexAndAlpha(group.attributes.background)),
          },
        });
      }

      if (group.attributes.underline) {
        const y = fontTop + fontHeight * 0.9;
        fwElement.children?.push({
          tag: "line",
          attributes: {
            x1: group.bounds.x,
            y1: y,
            x2: group.bounds.x + group.bounds.width,
            y2: y,
            ...getColorAttributes("stroke", toHexAndAlpha(group.attributes.color)),
            "stroke-width": fontHeight * 0.07,
          },
        });
      }

      if (group.attributes.strike) {
        const y = fontTop + fontHeight * 0.5;
        fwElement.children?.push({
          tag: "line",
          attributes: {
            x1: group.bounds.x,
            y1: y,
            x2: group.bounds.x + group.bounds.width,
            y2: y,
            ...getColorAttributes("stroke", toHexAndAlpha(group.attributes.color)),
            "stroke-width": fontHeight * 0.07,
          },
        });
      }

      const tspan = {
        tag: "tspan",
        attributes: {
          x: group.bounds.x,
          ...getColorAttributes("fill", toHexAndAlpha(group.attributes.color)),
          "font-size": group.attributes?.size ?? undefined,
          "font-weight": group.attributes?.bold ? "bold" : undefined,
          "font-style": group.attributes?.italic ? "italic" : undefined,
        },
        children: [group.text],
      };

      if (group.attributes.link) {
        lineElement.children!.push({
          tag: "a",
          attributes: {
            href: group.attributes.link,
            "xlink:href": group.attributes.link,
            target: "_blank",
            rel: "noopener",
          },
          children: [tspan],
        });
      } else {
        lineElement.children!.push(tspan);
      }
    });

    index += line.outputs.length;
  });

  return rootElement;
}

type InlineGroupItem = { bounds: IRectangle; text: string; attributes: DocAttributes };

function getInlineGroups(
  line: DocCompositionLine,
  getBounds: (index: number) => IRectangle,
  checkFn: (a?: DocAttributes, b?: DocAttributes) => boolean,
): InlineGroupItem[] {
  const ret: InlineGroupItem[] = [];
  let bgGroup: [number, IRectangle, string, DocAttributes] | undefined;

  const saveGroup = () => {
    if (bgGroup) ret.push({ bounds: bgGroup[1], text: bgGroup[2], attributes: bgGroup[3] });
    bgGroup = undefined;
  };

  line.outputs.forEach((op, inlineIndex) => {
    const bounds = getBounds(inlineIndex);

    if (bgGroup && bgGroup[0] + 1 === inlineIndex && checkFn(bgGroup[3], op.attributes)) {
      bgGroup[0] = inlineIndex;
      bgGroup[1] = { ...bgGroup[1], width: bgGroup[1].width + bounds.width };
      bgGroup[2] = bgGroup[2] + op.insert;
    } else {
      saveGroup();
      bgGroup = [inlineIndex, bounds, op.insert, op.attributes ?? {}];
    }

    if (inlineIndex === line.outputs.length - 1) {
      saveGroup();
    }
  });

  return ret;
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

export function applyDocAttributesToCtx(ctx: CanvasCTX, attrs: DocAttributes = {}, forMeasureWidth = false): void {
  const fontSize = attrs.size ?? DEFAULT_FONT_SIZE;
  const fontFamily = attrs.font ?? "Arial";
  const fontDecoration =
    attrs.bold && attrs.italic ? "bold italic" : attrs.bold ? "bold" : attrs.italic ? "italic" : "";

  ctx.font = `${fontDecoration} ${fontSize}px ${fontFamily}`;
  if (!forMeasureWidth) {
    const color = attrs.color ?? "#000";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.setLineDash([]);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }
}

export function getLineHeight(attrs: DocAttributes = {}, blockAttrs: DocAttributes = {}): number {
  const fontSize = attrs.size ?? DEFAULT_FONT_SIZE;
  const lineheight = blockAttrs.lineheight ?? DEFAULT_LINEHEIGHT;
  return fontSize * lineheight;
}

export function getBreakLineIndexWord(ctx: CanvasCTX, word: string, marginToTail: number): number | undefined {
  const width = measureTextWidth(ctx, word);
  if (width >= marginToTail) {
    for (let i = 1; i <= word.length; i++) {
      const w = measureTextWidth(ctx, word.slice(0, i));
      if (w >= marginToTail) {
        return i - 1;
      }
    }
  }

  return;
}

export function getBreakIndicesForWord(
  ctx: CanvasCTX,
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

/**
 * Returns right side item's location when "floor" is false and "p" is at right half of the character.
 * This function always returns the most probable location even if no character exists at "p".
 * => "isCursorInDoc" is available to check if any character exists at "p".
 *
 * When your interest is
 * - the cursor's location between characters, "floor" should be set false.
 * - the character's location, "floor" should be set true.
 */
export function getCursorLocationAt(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  p: IVec2,
  floor = false,
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
  for (let i = 0; i < compositionInLine.length; i++) {
    const c = compositionInLine[i];
    if (isLinebreak(c.char)) break;
    if (p.x < c.bounds.x + c.bounds.width * (floor ? 1 : 0.5)) break;
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

export function getDeltaByScaleTextSize(doc: DocOutput, scale: number, floor = false): DocDelta {
  return doc.map((o) => {
    const val = (o.attributes?.size ?? DEFAULT_FONT_SIZE) * scale;
    return {
      retain: o.insert.length,
      attributes: { size: floor ? Math.floor(val) : val },
    };
  });
}

/**
 * Link related attributes are treated as exception.
 * => Picked only when the position is inside a link.
 */
export function getNewInlineAttributesAt(lines: DocOutput[], position: IVec2): DocAttributes | undefined {
  const aroundAttrsInfo = getInlineAttributesAroundAt(lines, position);
  if (aroundAttrsInfo.around.length === 2 && aroundAttrsInfo.around[0]?.link === aroundAttrsInfo.around[1]?.link) {
    // Keep link style when the position is surrounded by link
    return aroundAttrsInfo.around[aroundAttrsInfo.target];
  }

  return deleteLinkAttibutes(aroundAttrsInfo.around[aroundAttrsInfo.target]);
}

/**
 * Returns inline attributes surrounding the position.
 */
function getInlineAttributesAroundAt(
  lines: DocOutput[],
  position: IVec2,
): {
  around: [DocAttributes | undefined] | [DocAttributes | undefined, DocAttributes | undefined];
  target: number; // index of "around" array that should be priority for the position
} {
  const targetLine = lines[position.y];

  if (position.x === 0) {
    const targetInfo = targetLine[position.x];
    // when position is the head of the line
    if (position.y > 0) {
      // get the tail item of the above line
      const beforeLine = lines[position.y - 1];
      const beforeInfo = beforeLine[beforeLine.length - 1];
      return { around: [beforeInfo.attributes, targetInfo.attributes], target: isLinebreak(beforeInfo.insert) ? 1 : 0 };
    } else {
      return { around: [targetInfo.attributes], target: 0 };
    }
  } else if (position.x >= targetLine.length) {
    const targetInfo = targetLine[targetLine.length - 1];
    // when position is the tail of the line
    if (position.y + 1 < lines.length) {
      // get the head item of the below line
      const afterLine = lines[position.y + 1];
      const afterInfo = afterLine[0];
      return { around: [targetInfo.attributes, afterInfo.attributes], target: isLinebreak(targetInfo.insert) ? 1 : 0 };
    } else {
      return { around: [targetInfo.attributes], target: 0 };
    }
  } else {
    const targetInfo = targetLine[position.x];
    // when position is neither the head nor the tail of the line
    // get the next item of the target
    const beforeInfo = targetLine[position.x - 1];
    return { around: [beforeInfo.attributes, targetInfo.attributes], target: 0 };
  }
}

export function deleteLinkAttibutes(src?: DocAttributes): DocAttributes | undefined {
  if (!src?.link) return src;

  const ret = { ...src };
  delete ret.link;
  delete ret.underline;
  delete ret.color;
  return ret;
}

export function deleteInlineExclusiveAttibutes(src?: DocAttributes): DocAttributes | undefined {
  return deleteLinkAttibutes(src);
}

export function getInitialOutput(attrs: DocAttributes = {}): DocOutput {
  return [{ insert: "\n", attributes: { direction: "middle", align: "center", ...attrs } }];
}

// The last output represents a doc's attributes
export function getDocAttributes(doc?: DocOutput): DocAttributes | undefined {
  if (!doc) return;
  return doc.length === 0 ? getInitialOutput()[0].attributes : doc[doc.length - 1].attributes;
}

export function mergeDocAttrInfo(info: DocAttrInfo): DocAttributes | undefined {
  if (!info.cursor && !info.block && !info.doc) return;

  const ret = info.cursor ? { ...info.cursor } : {};

  // block specific
  if (info?.block?.align) ret.align = info.block.align;
  if (info?.block?.lineheight) ret.lineheight = info.block.lineheight;

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
export function getDocLetterWidthMap(doc: DocOutput, ctx: CanvasCTX): Map<number, number> {
  const ret = new Map<number, number>();

  let cursor = 0;
  doc.forEach((op) => {
    applyDocAttributesToCtx(ctx, op.attributes, true);

    const segments = splitToSegments(op.insert);
    for (let i = 0; i < segments.length; i++) {
      const c = segments[i];
      if (isLinebreak(c)) {
        ret.set(cursor, 0);
      } else {
        ret.set(cursor, measureTextWidth(ctx, c));
      }
      cursor += 1;
    }
  });

  return ret;
}

const textWidthCache = newChronoCache<string, number>({ duration: 30000, getTimestamp: Date.now });
function measureTextWidth(ctx: CanvasCTX, text: string): number {
  const key = ctx.font + ":" + text;
  const cache = textWidthCache.getValue(key);
  if (cache) return cache;

  const width = ctx.measureText(text).width;
  textWidthCache.setValue(key, width);
  return width;
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

        if (left + unit[1] <= rangeWidth) {
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
  ctx: CanvasCTX,
  rangeWidth: number,
  rangeHeight: number,
): DocCompositionInfo {
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
  // TODO: Select same white space characters near by.
  if (isWordbreak(composition[cursor].char)) return [cursor, 1];

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

export function calcOriginalDocSize(doc: DocOutput, ctx: CanvasCTX, rangeWidth: number): Size {
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

export function getOutputSelection(composition: DocCompositionItem[], cursor: number, selection: number): number {
  const outputFrom = getRawCursor(composition, cursor);
  const outputTo = getRawCursor(composition, cursor + selection);
  return outputTo - outputFrom;
}

export function getDeltaAndCursorByBackspace(
  composition: DocCompositionItem[],
  cursor: number,
  selection: number,
): { delta: DocDelta; cursor: number } {
  if (composition.length <= 1) return { delta: [], cursor: 0 };

  const outputCursor = getRawCursor(composition, cursor);
  const outputSelection = getOutputSelection(composition, cursor, selection);
  if (outputSelection > 0) {
    return { cursor, delta: [{ retain: outputCursor }, { delete: outputSelection }] };
  } else {
    const cursorMinus1 = Math.max(cursor - 1, 0);
    const outputCursorMinus1 = getRawCursor(composition, cursorMinus1);
    return {
      cursor: cursorMinus1,
      delta: [{ retain: outputCursorMinus1 }, { delete: outputCursor - outputCursorMinus1 }],
    };
  }
}

export function getDeltaAndCursorByDelete(
  composition: DocCompositionItem[],
  docLength: number,
  cursor: number,
  selection: number,
): { delta: DocDelta; cursor: number } {
  if (composition.length <= 1) return { delta: [], cursor: 0 };

  const outputCursor = getRawCursor(composition, cursor);
  const outputSelection = getOutputSelection(composition, cursor, selection);
  if (outputSelection > 0) {
    return { cursor, delta: [{ retain: outputCursor }, { delete: outputSelection }] };
  } else {
    const outputCursorPlus1 = getRawCursor(composition, Math.min(cursor + 1, docLength - 1));
    return {
      cursor,
      delta: [{ retain: outputCursor }, { delete: outputCursorPlus1 - outputCursor }],
    };
  }
}

export function getLocationIndex(lines: DocCompositionLine[], location: IVec2): number {
  const charIndex = lines.slice(0, location.y).reduce((n, line) => {
    return n + getLineLength(line);
  }, 0);

  return charIndex + location.x;
}

export function getLinkAt(
  info: DocCompositionInfo,
  p: IVec2,
):
  | {
      link: string;
      bounds: IRectangle;
      docRange: [cursor: number, selection: number];
    }
  | undefined {
  const isOnDoc = isCursorInDoc(info.composition, info.lines, p);
  if (!isOnDoc) return;

  const location = getCursorLocationAt(info.composition, info.lines, p, true);
  const item = info.lines[location.y].outputs[location.x];
  const link = item.attributes?.link;
  if (!link) return;

  const [fromIndex, toIndex] = getDocItemUnitRange(info.lines, location, (val) => val.attributes?.link === link);
  const bounds = getDocItemBounds(info.composition, fromIndex, toIndex);

  return {
    link,
    bounds,
    docRange: [fromIndex, toIndex - fromIndex + 1],
  };
}

function getDocItemUnitRange(
  lines: DocCompositionLine[],
  location: IVec2,
  isUnitFn: (val: DocDeltaInsert) => boolean,
): [from: number, to: number] {
  const item = lines[location.y].outputs[location.x];
  const index = getLocationIndex(lines, location);
  let fromIndex = index;
  {
    let x = location.x;
    let y = location.y;
    let current = item;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (x === 0) {
        if (y === 0) {
          break;
        } else {
          y--;
          x = lines[y].outputs.length - 1;
        }
      } else {
        x--;
      }

      current = lines[y].outputs[x];
      if (isUnitFn(current)) {
        fromIndex--;
      } else {
        break;
      }
    }
  }

  let toIndex = index;
  {
    let x = location.x;
    let y = location.y;
    let current = item;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (x === lines[y].outputs.length - 1) {
        if (y === lines.length - 1) {
          break;
        } else {
          y++;
          x = 0;
        }
      } else {
        x++;
      }

      current = lines[y].outputs[x];
      if (isUnitFn(current)) {
        toIndex++;
      } else {
        break;
      }
    }
  }

  return [fromIndex, toIndex];
}

function getDocItemBounds(composition: DocCompositionItem[], from: number, to: number): IRectangle {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = from; i <= to; i++) {
    const bounds = composition[i].bounds;
    minX = Math.min(bounds.x, minX);
    minY = Math.min(bounds.y, minY);
    maxX = Math.max(bounds.x + bounds.width, maxX);
    maxY = Math.max(bounds.y + bounds.height, maxY);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function clearLinkRelatedAttrubites(src?: DocAttributes): DocAttributes {
  const keys = Object.keys(LINK_STYLE_ATTRS);
  const ret = { ...src, link: null };
  keys.forEach((key) => ((ret as any)[key] = null));
  return ret;
}
