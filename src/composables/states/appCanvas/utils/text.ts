import { Shape } from "../../../../models";
import { DocDelta, DocOutput } from "../../../../models/document";
import { createShape, resizeOnTextEdit, shouldResizeOnTextEdit } from "../../../../shapes";
import { TextShape } from "../../../../shapes/text";
import { calcOriginalDocSize } from "../../../../utils/textEditor";
import { AppCanvasStateContext } from "../core";

export function getPatchShapeByDocumentUpdate(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite" | "getRenderCtx" | "patchDocDryRun">,
  delta: DocDelta,
  id: string,
): Partial<Shape> | undefined {
  const shapeComposite = ctx.getShapeComposite();
  const shape = shapeComposite.shapeMap[id];
  const renderCtx = ctx.getRenderCtx();
  let shapePatch: Partial<Shape> | undefined = undefined;
  const resizeOnTextEditInfo = shouldResizeOnTextEdit(shapeComposite.getShapeStruct, shape);
  if (renderCtx && resizeOnTextEditInfo?.maxWidth) {
    const patched = ctx.patchDocDryRun(id, delta);
    const size = calcOriginalDocSize(patched, renderCtx, resizeOnTextEditInfo.maxWidth);
    shapePatch = resizeOnTextEdit(shapeComposite.getShapeStruct, shape, size);
  }
  return shapePatch;
}

export function createNewTextShapeForDocument(
  ctx: Pick<AppCanvasStateContext, "getShapeStruct" | "getRenderCtx">,
  delta: DocOutput,
  src: Partial<TextShape> = {},
): TextShape {
  const shape = createShape<TextShape>(ctx.getShapeStruct, "text", src);
  const renderCtx = ctx.getRenderCtx();
  let shapePatch: Partial<Shape> | undefined = undefined;
  const resizeOnTextEditInfo = shouldResizeOnTextEdit(ctx.getShapeStruct, shape);
  if (renderCtx && resizeOnTextEditInfo?.maxWidth) {
    const size = calcOriginalDocSize(delta, renderCtx, resizeOnTextEditInfo.maxWidth);
    shapePatch = resizeOnTextEdit(ctx.getShapeStruct, shape, size);
  }
  return { ...shape, ...shapePatch };
}
