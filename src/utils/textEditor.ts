import { IRectangle, IVec2 } from "okageo";
import { DocAttributes, DocDeltaInsert, DocOutput } from "../models/document";

const DEFAULT_FONT_SIZE = 18;

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
    const lineComposition = composition[index];
    line.outputs.forEach((op) => {
      applyDocAttributesToCtx(ctx, op.attributes);
      ctx.fillText(op.insert, lineComposition.bounds.x, lineComposition.bounds.y);
      index += op.insert.length;
    });
  });

  composition.forEach((c) => {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.strokeRect(c.bounds.x, c.bounds.y, c.bounds.width, c.bounds.height);
  });
}

// Returns { x: column index in the line, y: row index of the line }
export function getCharacterPosition(textLines: string[], cursor: number): IVec2 {
  let x = 0;
  let y = 0;
  let count = 0;

  textLines.some((text) => {
    if (count + text.length < cursor - 1) {
      count += text.length + 1; // +1 is for line break
      y += 1;
      return;
    } else if (count + text.length === cursor - 1) {
      y = Math.min(y + 1, textLines.length - 1);
      x = 0;
    } else {
      x = Math.min(cursor - count, text.length);
    }

    return true;
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

export interface DocCompositionItem {
  char: string; // A character
  bounds: IRectangle;
}

export interface DocCompositionLine {
  height: number; // A character
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

    op.insert.split("\n").forEach((line) => {
      line.split(" ").forEach((word, i) => {
        const wordWithSpace = (i === 0 ? "" : " ") + word;
        const index = getBreakLineIndexWord(ctx, wordWithSpace, range.width - left);
        if (index !== undefined) {
          const headText = wordWithSpace.slice(0, index);
          const tailText = wordWithSpace.slice(index);
          pushItem({ insert: headText });
          row += 1;
          left = ctx.measureText(tailText).width;
          pushItem({ insert: tailText });
          // TODO Recur "tailText"
        } else {
          left += ctx.measureText(wordWithSpace).width;
          pushItem({ insert: wordWithSpace });
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
