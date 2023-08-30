import { IRectangle, IVec2 } from "okageo";
import { DocAttributes, DocDeltaInsert, DocOutput } from "../models/document";

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
  const composition = getDocComposition(ctx, lines);
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

    const lineComposition = composition[index];
    line.outputs.forEach((op) => {
      applyDocAttributesToCtx(ctx, op.attributes);
      ctx.fillText(op.insert, lineComposition.bounds.x, lineComposition.bounds.y);
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
  const fontSize = attrs.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = attrs.fontFamily ?? "Arial";
  const color = attrs.color ?? "#000";

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
}

export function getLineHeight(attrs: DocAttributes = {}): number {
  const fontSize = attrs.fontSize ?? DEFAULT_FONT_SIZE;
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
  height: number;
  outputs: DocOutput;
}

export function getDocComposition(ctx: CanvasRenderingContext2D, lines: DocCompositionLine[]): DocCompositionItem[] {
  const ret: DocCompositionItem[] = [];
  let top = 0;
  let left = 0;
  lines.forEach((line) => {
    const lineHeight = line.height;

    line.outputs.forEach((unit) => {
      applyDocAttributesToCtx(ctx, unit.attributes);

      for (let i = 0; i < unit.insert.length; i++) {
        const char = unit.insert[i];
        const width = ctx.measureText(char).width;
        ret.push({
          char,
          bounds: { x: left, width, y: top, height: lineHeight },
        });
        left += width;
      }
    });

    top += lineHeight;
    left = 0;
  });

  return ret;
}

export function getLineOutputs(ctx: CanvasRenderingContext2D, doc: DocOutput, range: IRectangle): DocCompositionLine[] {
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
        lines[row - 1].push({ insert: "\n" });
      }

      line.split(" ").forEach((word, c) => {
        const wordWithSpace = (c === 0 ? "" : " ") + word;
        const breaks = getBreakIndicesForWord(ctx, wordWithSpace, range.width - left, range.width);
        if (!breaks || breaks.length === 0) {
          pushItem({ insert: wordWithSpace });
          left += ctx.measureText(wordWithSpace).width;
        } else {
          let prev = 0;
          breaks.forEach((index) => {
            const insert = wordWithSpace.slice(prev, index);
            pushItem({ insert });
            row += 1;
            prev = index;
          });

          const remain = wordWithSpace.slice(breaks[breaks.length - 1]);
          pushItem({ insert: remain });
          left = ctx.measureText(remain).width;
        }
      });
      row += 1;
      left = 0;
    });
  });

  return lines.map((line) => {
    return {
      height: Math.max(...line.map((unit) => getLineHeight(unit.attributes))),
      outputs: line,
    };
  });
}

export function getCursorLocationAt(
  composition: DocCompositionItem[],
  compositionLines: DocCompositionLine[],
  p: IVec2
): IVec2 {
  let lineIndex = -1;

  if (0 <= p.y) {
    let top = 0;
    lineIndex += 1;
    compositionLines.some((line) => {
      const next = top + line.height;
      if (top <= p.y && p.y < next) return true;
      top = next;
      lineIndex += 1;
    });
  }

  lineIndex = Math.min(Math.max(lineIndex, 0), compositionLines.length - 1);
  const charIndex = compositionLines.slice(0, lineIndex).reduce((n, line) => {
    return n + line.outputs.reduce((m, o) => m + o.insert.length, 0);
  }, 0);
  const lengthInLine = compositionLines[lineIndex].outputs.reduce((m, o) => m + o.insert.length, 0);
  const compositionInLine = composition.slice(charIndex, charIndex + lengthInLine);

  let xIndex = 0;
  if (0 <= p.x) {
    for (let i = 0; i < compositionInLine.length; i++) {
      const c = compositionInLine[i];
      const next = c.bounds.x + c.bounds.width;
      if (c.bounds.x <= p.x && p.x < next) {
        if (c.bounds.x + c.bounds.width / 2 < p.x) xIndex += 1;
        break;
      }
      xIndex += 1;
    }
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
