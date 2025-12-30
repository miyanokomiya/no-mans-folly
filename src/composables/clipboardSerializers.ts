import { DocOutput } from "../models/document";
import { ShapeTemplateInfo } from "../shapes/utils/shapeTemplateUtil";
import { newClipboardSerializer } from "./clipboard";

export const clipboardShapeSerializer = newClipboardSerializer<"shapes", ShapeTemplateInfo>("shapes");
export const clipboardDocSerializer = newClipboardSerializer<"doc", { doc: DocOutput }>("doc");
