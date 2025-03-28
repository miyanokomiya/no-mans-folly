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

const addShapeParam = { point: z.object({ x: z.number(), y: z.number() }) };
export function addShape(): ToolStruct<typeof addShapeParam> {
  return {
    name: "add_shape",
    description: "Add new shape",
    paramsSchema: addShapeParam,
    cb: async (ctx, { point }) => {
      const page = ctx.existingPage();
      const id = await page.evaluate(appAddShape, { point });

      return {
        content: [{ type: "text", text: id ? `Create shape id is "${id}"` : "No shape was added" }],
      };
    },
  };
}

async function appAddShape(props: { point: { x: number; y: number } }): Promise<string> {
  const app = (window as any).no_mans_folly;
  if (!app) return "";

  const accxt = app.getStateContext();
  const shape = app.createShape(accxt.getShapeStruct, "rectangle", {
    id: accxt.generateUuid(),
    findex: accxt.createLastIndex(),
    p: props.point,
  });
  accxt.addShapes([shape]);
  accxt.selectShape(shape.id);
  accxt.toView(shape.p);
  return shape.id;
}
