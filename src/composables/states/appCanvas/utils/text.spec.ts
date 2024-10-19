import { describe, test, expect } from "vitest";
import { createNewTextShapeForDocument, getPatchShapeByDocumentUpdate } from "./text";
import { createShape, getCommonStruct } from "../../../../shapes";
import { DocOutput } from "../../../../models/document";
import { newShapeComposite } from "../../../shapeComposite";
import { TextShape } from "../../../../shapes/text";

describe("getPatchShapeByDocumentUpdate", () => {
  test("should return patch to optimize the shape for the text", () => {
    const shape = createShape(getCommonStruct, "text", { id: "a" });
    const ctx: Parameters<typeof getPatchShapeByDocumentUpdate>[0] = {
      getShapeComposite: () =>
        newShapeComposite({
          shapes: [shape],
          getStruct: getCommonStruct,
        }),
      getRenderCtx: () => ({ measureText: (v: string) => ({ width: v.length * 2 }) }) as any,
      patchDocDryRun: (_, v) => v as DocOutput,
    };
    const delta: DocOutput = [{ insert: "abc", attributes: { size: 20 } }, { insert: "\n" }];
    const result = getPatchShapeByDocumentUpdate(ctx, delta, "a") as Partial<TextShape> | undefined;
    expect(result?.width).toBeCloseTo(6);
    expect(result?.height).toBeCloseTo(24);
  });
});

describe("createNewTextShapeForDocument", () => {
  test("should return text shape optimized for the text", () => {
    const ctx: Parameters<typeof createNewTextShapeForDocument>[0] = {
      getShapeStruct: getCommonStruct,
      getRenderCtx: () => ({ measureText: (v: string) => ({ width: v.length * 2 }) }) as any,
    };
    const delta: DocOutput = [{ insert: "abc", attributes: { size: 20 } }, { insert: "\n" }];
    const result = createNewTextShapeForDocument(ctx, delta);
    expect(result.width).toBeCloseTo(6);
    expect(result.height).toBeCloseTo(24);
  });
});
