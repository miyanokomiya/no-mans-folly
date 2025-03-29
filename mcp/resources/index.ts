import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceStruct } from "../types";
import * as web from "../web/shapes";

export const getResources = () => [getShapes(), getShapeById(), getShapeTexts(), getShapeTextById()];

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
      name: "Get shape",
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

function getShapeTexts(): ResourceStruct {
  return {
    schema: {
      uri: "app://texts/all",
      name: "Get all shape texts",
      description: "Get all shape texts. Each text data is an array of Quil delta formats.",
    },
    read: async (ctx) => {
      const page = ctx.existingPage();
      const data = await page.evaluate(web.getShapeTexts);

      return {
        contents: Object.entries(data).map(([id, item]) => ({
          uri: `app://text/${id}`,
          text: JSON.stringify(item),
          mimeType: "application/json",
        })),
      };
    },
  };
}

function getShapeTextById(): ResourceStruct {
  return {
    schema: {
      template: new ResourceTemplate("app://text/{shapeId}", { list: undefined }),
      name: "Get shape text",
      description: "Get a shape text by the shape ID. Text data is an array of Quil delta formats.",
    },
    read: async (ctx, uri, extra) => {
      const page = ctx.existingPage();
      const data = await page.evaluate(web.getShapeTextById, extra.shapeId as string);
      if (!data) throw new Error("Resource not found");

      return {
        contents: [
          {
            uri,
            text: JSON.stringify(data),
            mimeType: "application/json",
          },
        ],
      };
    },
  };
}
