import { z } from "zod";

const PointRawSchema = { x: z.number(), y: z.number() };

const ColorRawSchema = {
  r: z.number().min(0).max(255).describe("Red value of the color."),
  g: z.number().min(0).max(255).describe("Green value of the color."),
  b: z.number().min(0).max(255).describe("Blue value of the color."),
  a: z.number().min(0).max(1).describe("Alpha value of the color. 0 is transparent, and 1 is opaque."),
};

const FillStyleRawSchema = {
  disabled: z.boolean().optional().describe("When true, the color won't be filled."),
  color: z.object(ColorRawSchema).describe("Color to fill."),
};

const StrokeStyleRawSchema = {
  disabled: z.boolean().optional().describe("When true, the color won't be stroked."),
  color: z.object(ColorRawSchema).describe("Color to stroke."),
  width: z.number().positive().optional().default(1).describe("Width of the stroke."),
  dash: z
    .enum(["solid", "dot", "short", "long"])
    .optional()
    .default("solid")
    .describe("Type of the line dash. 'solid' means no dash."),
  lineCap: z.enum(["butt", "round", "square"]).optional().default("butt").describe("Line cap of the stroke."),
  lineJoin: z.enum(["bevel", "round", "miter"]).optional().default("bevel").describe("Line join of the stroke."),
};

const CommonStyleRawSchema = {
  fill: z
    .object(FillStyleRawSchema)
    .optional()
    .describe("Fill style of the shape. Defaults to white if not specified."),
  stroke: z
    .object(StrokeStyleRawSchema)
    .optional()
    .describe("Stroke style of the shape. Defaults to black if not specified."),
};

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
    .positive()
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
  ...CommonStyleRawSchema,
  width: z.number().positive().describe("Width of the shape's bound"),
  height: z.number().positive().describe("Height of the shape's bound"),
};
const ShapeParamEllipse = {
  ...ShapeParamBase,
  ...CommonStyleRawSchema,
  rx: z.number().positive().describe("X-axis radius of the ellipse. It's half of the width of the shape's bound."),
  ry: z.number().positive().describe("Y-axis radius of the ellipse. It's half of the height of the shape's bound."),
};
const ShapeParamLine = {
  ...ShapeParamBase,
  stroke: z.object(StrokeStyleRawSchema).describe("Stroke style of the line. Defaults to black if not specified."),
  p: z.object(PointRawSchema).default({ x: 0, y: 0 }).describe("Coordinates of the starting vertex of the line."),
  q: z.object(PointRawSchema).default({ x: 100, y: 0 }).describe("Coordinates of the ending vertex of the line."),
  pConnection: z
    .object(ConnectionRawSchema)
    .optional()
    .describe("Connection data for the starting vertex of the line."),
  qConnection: z.object(ConnectionRawSchema).optional().describe("Connection data for the ending vertex of the line."),
  pHead: z.object(LineHeadRawSchema).optional().describe("Line head style for the starting vertex."),
  qHead: z.object(LineHeadRawSchema).optional().describe("Line head style for the ending vertex."),
  body: z.array(z.object(LineBodyItemRawSchema)).optional().describe("Inner vertices of the line."),
  lineType: z
    .enum(["stright", "elbow"])
    .optional()
    .default("stright")
    .describe(
      "Type of the line. 'stright' represents a straight line, while 'elbow' automatically adjusts the body to form right angles.",
    ),
  jump: z.boolean().optional().describe("Whether the line should jump over other lines at intersections."),
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
