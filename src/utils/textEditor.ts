import { DocOutput } from "../models/document";

export function getTextLines(doc: DocOutput): string[] {
  return doc
    .map((d) => d.insert)
    .join("")
    .split("\n");
}

export function getDocLength(doc: DocOutput): number {
  return doc.map((d) => d.insert).reduce((p, v) => p + v.length, 0);
}

export function renderDoc(ctx: CanvasRenderingContext2D, doc: DocOutput) {
  const fontSize = 18;
  ctx.fillStyle = "#000";
  ctx.font = `${fontSize}px Arial`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const textLines = getTextLines(doc);
  let top = 0;
  textLines.forEach((text) => {
    ctx.fillText(text, 0, top);
    top += fontSize;
  });
}
