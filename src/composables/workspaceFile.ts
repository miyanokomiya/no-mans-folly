import * as Y from "yjs";
import { newShapeStore } from "../stores/shapes";
import { ShapeTemplateInfo } from "../shapes/utils/shapeTemplateUtil";
import { newDocumentStore } from "../stores/documents";

export async function loadShapesFromSheetFile(sheetFile: File): Promise<ShapeTemplateInfo | undefined> {
  const buffer = await sheetFile.arrayBuffer();
  if (buffer.byteLength === 0) return;

  const baseUpdate = new Uint8Array(buffer);
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, baseUpdate);
  const shapeStore = newShapeStore({ ydoc });
  const shapes = shapeStore.getEntities();
  const docStore = newDocumentStore({ ydoc });
  const docMap = docStore.getDocMap();

  const docs: ShapeTemplateInfo["docs"] = [];
  shapes.forEach((s) => {
    const doc = docMap[s.id];
    if (doc) {
      docs.push([s.id, doc]);
    }
  });

  shapeStore.dispose();
  docStore.dispose();
  ydoc.destroy();

  return shapes.length > 0 ? { shapes, docs } : undefined;
}
