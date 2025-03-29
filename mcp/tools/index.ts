import { z } from "zod";
import type { ToolStruct } from "../types";
import * as web from "../web/shapes";
import { ShapeParamSchema } from "./shapeSchema";

export const getTools = () => [openApp(), closeApp(), addShape(), addShapes(), deleteShapes()];

function openApp(): ToolStruct {
  return {
    name: "open_app",
    description: "Open No-man's folly application",
    cb: async (ctx) => {
      await ctx.createPage();
      return { content: [{ type: "text", text: "Opened" }] };
    },
  };
}

function closeApp(): ToolStruct {
  return {
    name: "close_app",
    description: "Close No-man's folly application",
    cb: async (ctx) => {
      await ctx.close();
      return { content: [{ type: "text", text: "Closed" }] };
    },
  };
}

const ShapeTypeParam = {
  data: ShapeParamSchema,
};

function addShape(): ToolStruct<typeof ShapeTypeParam> {
  return {
    name: "add_shape",
    description: "Add new shape and return its id",
    paramsSchema: ShapeTypeParam,
    cb: async (ctx, { data }) => {
      const page = ctx.existingPage();
      const id = await page.evaluate(web.addShape, data);
      return {
        content: [{ type: "text", text: id, mimeType: "application/json" }],
      };
    },
  };
}

const ShapesTypeParam = {
  data: z.array(ShapeParamSchema),
};
function addShapes(): ToolStruct<typeof ShapesTypeParam> {
  return {
    name: "add_shapes",
    description: "Add new shapes in batch and return their ids",
    paramsSchema: ShapesTypeParam,
    cb: async (ctx, { data }) => {
      const page = ctx.existingPage();
      const ids = await page.evaluate(web.addShapes, data);
      return {
        content: [{ type: "text", text: JSON.stringify(ids), mimeType: "application/json" }],
      };
    },
  };
}

const DeleteShapesTypeParam = {
  data: z.array(z.string()).describe("Shape ids to delete"),
};
function deleteShapes(): ToolStruct<typeof DeleteShapesTypeParam> {
  return {
    name: "delete_shapes",
    description: "Delete shapes and return deleted shape ids. All child shapes of the targets will be deleted as well.",
    paramsSchema: DeleteShapesTypeParam,
    cb: async (ctx, { data }) => {
      const page = ctx.existingPage();
      const ids = await page.evaluate(web.deleteShapes, data);
      return {
        content: [{ type: "text", text: JSON.stringify(ids), mimeType: "application/json" }],
      };
    },
  };
}
