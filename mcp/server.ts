import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Context } from "./context";
import * as tools from "./tools/index";
import * as resources from "./resources/index";

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

  const toolItems = [tools.openApp(), tools.closeApp(), tools.addShape(), tools.addShapes()];
  toolItems.forEach((tool) => {
    server.tool(tool.name, tool.description, tool.paramsSchema ?? {}, (args) => {
      return tool.cb(context, args as any);
    });
  });

  const resourceItems = [resources.getShapes(), resources.getShapeById()];
  resourceItems.forEach((resource) => {
    if ("template" in resource.schema) {
      server.resource(resource.schema.name, resource.schema.template, resource.schema, (url, extra) => {
        return resource.read(context, url.href, extra);
      });
    } else {
      const { uri, ...meta } = resource.schema;
      server.resource(resource.schema.name, uri, meta, (url, extra: any) => {
        return resource.read(context, url.href, extra);
      });
    }
  });

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);
})();
