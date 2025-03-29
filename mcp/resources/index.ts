import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceStruct } from "../types";
import * as web from "../web/shapes";

export const getResources = () => [getShapes(), getShapeById()];

function getShapes(): ResourceStruct {
  return {
    schema: {
      uri: "app://shapes/all",
      name: "Get all shapes",
      description: "Get all shapes",
    },
    read: async (ctx) => {
      const page = ctx.existingPage();
      const shapes = await page.evaluate(web.getShapes);

      return {
        contents: shapes.map((s) => ({
          uri: `app://shape/${s.id}`,
          text: JSON.stringify(s),
          mimeType: "application/json",
        })),
      };
    },
  };
}

function getShapeById(): ResourceStruct {
  return {
    schema: {
      template: new ResourceTemplate("app://shape/{shapeId}", { list: undefined }),
      name: "Get a shape by ID",
      description: "Get a shape by ID",
    },
    read: async (ctx, uri, extra) => {
      const page = ctx.existingPage();
      const shape = await page.evaluate(web.getShapeById, extra.shapeId as string);
      if (!shape) throw new Error("Resource not found");

      return {
        contents: [
          {
            uri,
            text: JSON.stringify(shape),
            mimeType: "application/json",
          },
        ],
      };
    },
  };
}
