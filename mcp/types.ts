import type { ZodRawShape } from "zod";
import type { ToolCallback, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context } from "./context";
import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

export type ToolStruct<Args extends ZodRawShape | undefined = undefined> = {
  name: string;
  description: string;
  paramsSchema?: Args;
  cb: (ctx: Context, args: Parameters<ToolCallback<Args>>[0]) => ReturnType<ToolCallback<Args>>;
};

export type ResourceSchema = {
  name: string;
  description: string;
} & ({ uri: string } | { template: ResourceTemplate });

export type ResourceStruct = {
  schema: ResourceSchema;
  read: (ctx: Context, uri: string, extra: { [key: string]: string | string[] }) => Promise<ReadResourceResult>;
};
