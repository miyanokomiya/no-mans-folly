import { z } from "zod";
import type { ToolStruct } from "../types";
import * as web from "../web/shapes";

export function openApp(): ToolStruct {
  return {
    name: "open_app",
    description: "Open No-man's folly application",
    cb: async (ctx) => {
      await ctx.createPage();
      return { content: [{ type: "text", text: "Opened" }] };
    },
  };
}

export function closeApp(): ToolStruct {
  return {
    name: "close_app",
    description: "Close No-man's folly application",
    cb: async (ctx) => {
      await ctx.close();
      return { content: [{ type: "text", text: "Closed" }] };
    },
  };
}

const ShapeParamBase = {
  p: z
    .object({ x: z.number(), y: z.number() })
    .default({ x: 0, y: 0 })
    .describe("Coordinates of the shape's position that refers to the top-left corner of the shape's bounding box."),
  rotation: z.number().optional().describe("Rotation of the shape in radians, applied around its center."),
};
const ShapeParamRectangle = {
  ...ShapeParamBase,
  width: z.number().describe("Width of the shape's bound"),
  height: z.number().describe("Height of the shape's bound"),
};
const ShapeParamEllipse = {
  ...ShapeParamBase,
  rx: z.number().describe("X-axis radius of the ellipse. It's half of the width of the shape's bound."),
  ry: z.number().describe("Y-axis radius of the ellipse. It's half of the height of the shape's bound."),
};

const ShapeTypeParam = {
  data: z
    .union([
      z.object({ type: z.literal("rectangle"), ...ShapeParamRectangle }),
      z.object({ type: z.literal("ellipse"), ...ShapeParamEllipse }),
      z.object({ type: z.literal("star"), ...ShapeParamRectangle }),
      z.object({ type: z.literal("chevron"), ...ShapeParamRectangle }),
    ])
    .describe("Shape data"),
};

export function addShape(): ToolStruct<typeof ShapeTypeParam> {
  return {
    name: "add_shape",
    description: "Add new shape",
    paramsSchema: ShapeTypeParam,
    cb: async (ctx, { data }) => {
      const page = ctx.existingPage();
      const id = await page.evaluate(web.addShape, data);
      return {
        content: [{ type: "text", text: id ? `Created shape id is "${id}"` : "No shape was added" }],
      };
    },
  };
}

const ShapesTypeParam = {
  data: z.array(ShapeTypeParam.data),
};
export function addShapes(): ToolStruct<typeof ShapesTypeParam> {
  return {
    name: "add_shapes",
    description: "Add new shapes",
    paramsSchema: ShapesTypeParam,
    cb: async (ctx, { data }) => {
      const page = ctx.existingPage();
      const ids = await page.evaluate(web.addShapes, data);
      return {
        content: [
          { type: "text", text: ids.length > 0 ? `Created shape ids are "${ids.join(" ")}"` : "No shape was added" },
        ],
      };
    },
  };
}

const DeleteShapesTypeParam = {
  data: z.array(z.string()).describe("Shape ids to delete"),
};
export function deleteShapes(): ToolStruct<typeof DeleteShapesTypeParam> {
  return {
    name: "delete_shapes",
    description: "Delete shapes. All child shapes of the targets will be deleted as well.",
    paramsSchema: DeleteShapesTypeParam,
    cb: async (ctx, { data }) => {
      const page = ctx.existingPage();
      const ids = await page.evaluate(web.deleteShapes, data);
      return {
        content: [
          { type: "text", text: ids.length > 0 ? `Deleted shape ids are "${ids.join(" ")}"` : "No shape was deleted" },
        ],
      };
    },
  };
}
