import { z } from "zod";

const PointRawSchema = { x: z.number(), y: z.number() };

const ConnectionRawSchema = {
  id: z.string().describe("ID of the target shape that is attached to."),
  rate: z
    .object(PointRawSchema)
    .describe(
      "Relative position rate in the target bounds. {x: 0, y: 0} is the top-left corner of the target, and {x: 1, y: 1} is the bottom-right corner.",
    ),
  optimized: z
    .boolean()
    .optional()
    .describe("When true, the line will be automatically adjusted as if it's connected to the outline of the target."),
};

const LineBodyItemRawSchema = {
  p: z.object(PointRawSchema).describe("Coordinates of the inner vertex of the line."),
  c: z.object(ConnectionRawSchema).optional().describe("Connection data of the inner vertex of the line."),
};

const LineHeadRawSchema = {
  type: z
    .enum([
      "open",
      "closed_filled",
      "closed_blank",
      "dot_filled",
      "dot_blank",
      "dot_top_filled",
      "dot_top_blank",
      "diamond_filled",
      "diamond_blank",
      "star_stiff_filled",
      "star_stiff_blank",
      "er_one",
      "er_many",
      "er_one_only",
      "er_one_many",
      "er_zero_one",
      "er_zero_many",
    ])
    .describe("Type of the line head."),
  size: z
    .number()
    .optional()
    .default(6)
    .describe("Size of the line head. The actual size is determined by multiplying this value and the line width."),
};

const ShapeParamBase = {
  p: z
    .object(PointRawSchema)
    .default({ x: 0, y: 0 })
    .describe("Coordinates of the shape's position that refers to the top-left corner of the shape's bounding box."),
  rotation: z.number().optional().describe("Rotation of the shape in radians, applied around its center."),
};
const ShapeParamRectangle = {
  ...ShapeParamBase,
  width: z.number().min(0).describe("Width of the shape's bound"),
  height: z.number().min(0).describe("Height of the shape's bound"),
};
const ShapeParamEllipse = {
  ...ShapeParamBase,
  rx: z.number().min(0).describe("X-axis radius of the ellipse. It's half of the width of the shape's bound."),
  ry: z.number().min(0).describe("Y-axis radius of the ellipse. It's half of the height of the shape's bound."),
};
const ShapeParamLine = {
  ...ShapeParamBase,
  p: z.object(PointRawSchema).default({ x: 0, y: 0 }).describe("Coordinates of the first vertex of the line."),
  q: z.object(PointRawSchema).default({ x: 100, y: 0 }).describe("Coordinates of the last vertex of the line."),
  pConnection: z.object(ConnectionRawSchema).optional().describe("Connection data of the first vertex of the line."),
  qConnection: z.object(ConnectionRawSchema).optional().describe("Connection data of the last vertex of the line."),
  pHead: z.object(LineHeadRawSchema).optional().describe("Line head of the first vertex of the line."),
  qHead: z.object(LineHeadRawSchema).optional().describe("Line head of the last vertex of the line."),
  body: z.array(z.object(LineBodyItemRawSchema)).optional().describe("Inner vertices of the line."),
  lineType: z.enum(["stright", "elbow"]).optional().default("stright").describe("Type of the line."),
  jump: z.boolean().optional().describe("When true, the line will jump over other lines at the intersections."),
};

export const ShapeParamSchema = z
  .union([
    z.object({ type: z.literal("rectangle"), ...ShapeParamRectangle }),
    z.object({ type: z.literal("ellipse"), ...ShapeParamEllipse }),
    z.object({ type: z.literal("star"), ...ShapeParamRectangle }),
    z.object({ type: z.literal("chevron"), ...ShapeParamRectangle }),
    z.object({ type: z.literal("line"), ...ShapeParamLine }),
  ])
  .describe("Shape data");
