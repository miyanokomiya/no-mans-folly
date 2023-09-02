import { IRectangle, IVec2 } from "okageo";
import { DocAttributes, DocDelta, DocDeltaInsert, DocOutput } from "../models/document";

export const DEFAULT_FONT_SIZE = 18;

export function getTextLines(doc: DocOutput): string[] {
  return doc
    .map((d) => d.insert)
    .join("")
    .split("\n");
}

export function getDocLength(doc: DocOutput): number {
  return doc.map((d) => d.insert).reduce((p, v) => p + v.length, 0);
}

export function renderDoc(ctx: CanvasRenderingContext2D, doc: DocOutput, range: IRectangle) {
  const lines = getLineOutputs(ctx, doc, range);
  const composition = getDocComposition(ctx, lines, range.width);
  renderDocByComposition(ctx, composition, lines);
}

export function renderDocByComposition(
  ctx: CanvasRenderingContext2D,
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[]
) {
  let index = 0;
  compositionLines.forEach((line) => {
    if (index === composition.length) return;

    line.outputs.forEach((op) => {
      applyDocAttributesToCtx(ctx, op.attributes);
      const lineComposition = composition[index];
      // TODO: "0.8" isn't after any rule or theory but just a seem-good value for locating letters to the center.
      ctx.fillText(op.insert, lineComposition.bounds.x, lineComposition.bounds.y + lineComposition.bounds.height * 0.8);
      index += op.insert.length;
    });
  });

  // For debug
  // composition.forEach((c) => {
  //   ctx.strokeStyle = "red";
  //   ctx.lineWidth = 1;
  //   ctx.strokeRect(c.bounds.x, c.bounds.y, c.bounds.width, c.bounds.height);
  // });
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
  const color = attrs.color ?? "#000";

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

export function getLineHeight(attrs: DocAttributes = {}): number {
  const fontSize = attrs.size ?? DEFAULT_FONT_SIZE;
  return fontSize * 1;
}

export function getBreakLineIndexWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  marginToTail: number
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
  lineWidth: number
): number[] | undefined {
  const indexForTop = getBreakLineIndexWord(ctx, word, marginToTail);
  if (!indexForTop) return;

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

export interface DocCompositionItem {
  char: string; // A character
  bounds: IRectangle;
}

export interface DocCompositionLine {
  y: number;
  height: number;
  outputs: DocOutput;
}

export function getDocComposition(
  ctx: CanvasRenderingContext2D,
  lines: DocCompositionLine[],
  lineWidth: number
): DocCompositionItem[] {
  let ret: DocCompositionItem[] = [];

  lines.forEach((line) => {
    const lineHeight = line.height;
    let left = 0;
    let items: DocCompositionItem[] = [];

    line.outputs.forEach((unit) => {
      applyDocAttributesToCtx(ctx, unit.attributes);

      for (let i = 0; i < unit.insert.length; i++) {
        const char = unit.insert[i];
        // Ignore line break's width for block alignment
        const width = char === "\n" ? 0 : ctx.measureText(char).width;
        items.push({
          char,
          bounds: { x: left, width, y: line.y, height: lineHeight },
        });
        left += width;
      }
    });

    // left can represent content width here.
    const gap = lineWidth - left;

    const block = line.outputs[line.outputs.length - 1];
    if (block.attributes?.align === "right") {
      items = items.map((item) => ({
        ...item,
        bounds: { ...item.bounds, x: item.bounds.x + gap },
      }));
    } else if (block.attributes?.align === "center") {
      items = items.map((item) => ({
        ...item,
        bounds: { ...item.bounds, x: item.bounds.x + gap / 2 },
      }));
    }

    ret = ret.concat(items);
    left = 0;
  });

  return ret;
}

export function getLineOutputs(ctx: CanvasRenderingContext2D, doc: DocOutput, range: IRectangle): DocCompositionLine[] {
  if (doc.length === 0) return [];

  let row = 0;
  let left = 0;

  const lines: DocOutput[] = [];
  function pushItem(item: DocDeltaInsert) {
    lines[row] ??= [];
    lines[row].push(item);
  }

  doc.forEach((op) => {
    applyDocAttributesToCtx(ctx, op.attributes);

    op.insert.split("\n").forEach((line, r) => {
      if (r !== 0) {
        // The last part of the previous line
        pushItem({ insert: "\n", attributes: op.attributes });
        row += 1;
        left = 0;
      }

      if (line === "") return;

      line.split(" ").forEach((word, c) => {
        const wordWithSpace = (c === 0 ? "" : " ") + word;
        const breaks = getBreakIndicesForWord(ctx, wordWithSpace, range.width - left, range.width);
        if (!breaks || breaks.length === 0) {
          pushItem({ insert: wordWithSpace, attributes: op.attributes });
          left += ctx.measureText(wordWithSpace).width;
        } else {
          let prev = 0;
          breaks.forEach((index) => {
            const insert = wordWithSpace.slice(prev, index);
            pushItem({ insert, attributes: op.attributes });
            row += 1;
            left = 0;
            prev = index;
          });

          const remain = wordWithSpace.slice(breaks[breaks.length - 1]);
          pushItem({ insert: remain, attributes: op.attributes });
          left = ctx.measureText(remain).width;
        }
      });
    });
  });

  let top = 0;
  const ret = lines.map((line) => {
    const y = top;

    const height = Math.max(
      0,
      ...line.filter((unit) => unit.insert !== "\n").map((unit) => getLineHeight(unit.attributes))
    );
    top += height;
    return { y, height, outputs: line };
  });

  const lastBlock = doc[doc.length - 1].attributes;
  switch (lastBlock?.direction) {
    case "middle": {
      const margin = (range.height - top) / 2;
      return ret.map((line) => ({ ...line, y: line.y + margin }));
    }
    case "bottom": {
      const margin = range.height - top;
      return ret.map((line) => ({ ...line, y: line.y + margin }));
    }
    default:
      return ret;
  }
}

export function getCursorLocationAt(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  p: IVec2
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
  const lengthInLine = compositionLines[lineIndex].outputs.reduce((m, o) => m + o.insert.length, 0);
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

export function getBoundsAtLocation(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  location: IVec2
): IRectangle {
  if (composition.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const charIndex =
    compositionLines.slice(0, location.y).reduce((n, line) => {
      return n + line.outputs.reduce((m, o) => m + o.insert.length, 0);
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
  [cursor, length]: [cursor: number, length: number]
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

function getLineLength(line: DocCompositionLine): number {
  return line.outputs.reduce((n, o) => n + o.insert.length, 0);
}

export function getDeltaByApplyBlockStyle(
  composition: DocCompositionItem[],
  cursor: number,
  selection: number,
  attrs: DocAttributes
): DocDelta {
  const breakIndexList: number[] = [];
  for (let i = cursor; i < composition.length; i++) {
    const c = composition[i];
    if (c.char === "\n") {
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
      if (o.insert[i] === "\n") {
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
    count += o.insert.length;
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
