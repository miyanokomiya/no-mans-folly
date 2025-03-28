import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import type { Context } from "../context";

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

const paramsSchema = { a: z.number(), b: z.number() };
export function aaopenApp(): ToolStruct<typeof paramsSchema> {
  return {
    name: "open_app",
    description: "Open No-man's folly application",
    paramsSchema,
    cb: async (ctx, { a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
    }),
  };
}
