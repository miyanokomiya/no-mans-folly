import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import type { Context } from "../context.js";

type ToolStruct<Args extends ZodRawShape | undefined = undefined> = {
  name: string;
  description: string;
  paramsSchema?: Args;
  cb: (ctx: Context, args: Parameters<ToolCallback<Args>>[0]) => ReturnType<ToolCallback<Args>>;
};

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

const addShapeParam = {
  point: z.object({ x: z.number().default(0), y: z.number().default(0) }).describe("Point to add shape"),
  shape_type: z
    .union([
      z.literal("rectangle").describe("Rectangle shape"),
      z.literal("ellipse").describe("Ellipse shape"),
      z.literal("star").describe("Star (pentagram) shape that can turn into a variety of regular polygons"),
      z.literal("chevron").describe("Chevron shape heading toward right by default"),
    ])
    .default("rectangle")
    .describe("Type of shape to add"),
};
export function addShape(): ToolStruct<typeof addShapeParam> {
  return {
    name: "add_shape",
    description: "Add new shape",
    paramsSchema: addShapeParam,
    cb: async (ctx, { point, shape_type }) => {
      const page = ctx.existingPage();
      const id = await page.evaluate(appAddShape, { point, shape_type });

      return {
        content: [{ type: "text", text: id ? `Create shape id is "${id}"` : "No shape was added" }],
      };
    },
  };
}

async function appAddShape(props: { point: { x: number; y: number }; shape_type: string }): Promise<string> {
  const app = (window as any).no_mans_folly;
  if (!app) return "";

  const accxt = app.getStateContext();
  const shape = app.createShape(accxt.getShapeStruct, props.shape_type, {
    id: accxt.generateUuid(),
    findex: accxt.createLastIndex(),
    p: props.point,
  });
  accxt.addShapes([shape]);
  accxt.selectShape(shape.id);
  accxt.toView(shape.p);
  return shape.id;
}
