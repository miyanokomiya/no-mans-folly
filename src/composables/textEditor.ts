import { DocOutput } from "../models/document";
import { getDocLength, getTextLines } from "../utils/textEditor";

interface Option {}

export function newTextEditorController(option: Option) {
  let ctx: CanvasRenderingContext2D;
  let doc: DocOutput;
  let docLength = 0;
  let cursor = 0;
  let textLines: string[] = [];

  function setRenderingContext(context: CanvasRenderingContext2D) {
    ctx = context;
  }

  function setDoc(argDoc: DocOutput = []) {
    doc = argDoc;
    docLength = getDocLength(doc);
    textLines = getTextLines(doc);
    console.log("setDoc", textLines);
  }

  function setCursor(c: number) {
    cursor = Math.max(c, 0);
  }

  function getCursor(): number {
    return Math.min(cursor, docLength + 1);
  }

  function moveCursorToHead() {
    cursor = 0;
  }

  function moveCursorToTail() {
    cursor = docLength;
  }

  function render(context: CanvasRenderingContext2D) {
    ctx = context;

    const fontSize = 18;
    ctx.font = `${18}px Arial`;
    ctx.strokeStyle = "#000";
    ctx.setLineDash([]);
    ctx.lineWidth = 2;

    const cursor = getCursor();
    let top = 0;
    let count = 0;
    textLines.some((text) => {
      let length = 0;
      if (count + text.length < cursor - 1) {
        count += text.length + 1; // 1 is for line break
        top += fontSize;
        return;
      } else if (count + text.length === cursor - 1) {
        top += fontSize;
      } else {
        length = cursor - count;
      }

      const left = ctx.measureText(text.slice(0, length)).width;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, top + fontSize);
      ctx.stroke();
      return true;
    });
  }

  return { setRenderingContext, setDoc, setCursor, getCursor, moveCursorToHead, moveCursorToTail, render };
}
export type TextEditorController = ReturnType<typeof newTextEditorController>;
