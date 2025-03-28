import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Context } from "./context.js";
import * as tools from "./tools/index.js";

(async () => {
  const context = new Context();

  // Create an MCP server
  const server = new McpServer({
    name: "No-man's folly MCP",
    version: "0.0.1",
  });
  server.close = async () => {
    await context.close();
  };

  // Add an addition tool
  server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }));

  const toolItems = [tools.openApp(), tools.closeApp(), tools.addShape()];

  toolItems.forEach((tool) => {
    server.tool(tool.name, tool.description, tool.paramsSchema ?? {}, (args) => {
      return tool.cb(context, args as any);
    });
  });

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();
