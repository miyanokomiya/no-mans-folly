import { z } from "zod";

const DocAttributesSchema = z.object({
  color: z
    .string()
    .nullable()
    .optional()
    .describe("Color value of the text. Format: rgba(r,g,b,a). Defaults to black if not specified"),
  background: z.string().nullable().optional().describe("Background color value of the text. Format: rgba(r,g,b,a)"),
  bold: z.boolean().nullable().optional(),
  italic: z.boolean().nullable().optional(),
  underline: z.boolean().nullable().optional(),
  strike: z.boolean().nullable().optional(),
  size: z.number().nullable().optional().describe("Size of the text. Defaults to 14 if not specified."),
  link: z.string().nullable().optional().describe("Link value of the text. Format: https://example.com"),

  align: z
    .enum(["left", "center", "right"])
    .nullable()
    .optional()
    .describe(
      "Alignment of the line. Defaults to center if not specified. This works only when the line-break of the line has this attribute.",
    ),
  lineheight: z
    .number()
    .nullable()
    .optional()
    .describe(
      "Line height of the text. Defaults to 1.5 if not specified. This works only when the line-break of the line has this attribute.",
    ),

  direction: z
    .enum(["top", "middle", "bottom"])
    .nullable()
    .optional()
    .describe(
      "Direction of the text. Defaults to middle if not specified. This works only when the last line-break of the text content has this attribute.",
    ),
});

const DocDeltaInsertSchema = z
  .object({
    insert: z.string(),
    attributes: DocAttributesSchema.optional(),
  })
  .describe("Insert operation in the Quil delta format. Contains the text to be inserted and optional attributes.");

const DocDeltaDeleteSchema = z
  .object({
    delete: z.number(),
  })
  .describe("Delete operation in the Quil delta format. Contains the number of characters to be deleted.");

const DocDeltaRetainSchema = z
  .object({
    retain: z.number(),
    attributes: DocAttributesSchema.optional(),
  })
  .describe(
    "Retain operation in the Quil delta format. Contains the number of characters to be retained and optional attributes.",
  );

const DocDeltaOpSchema = z.union([DocDeltaInsertSchema, DocDeltaDeleteSchema, DocDeltaRetainSchema]);

const DocOutputSchema = z
  .array(DocDeltaOpSchema)
  .describe("Array of operations representing the Quil delta format for text content.");

export const DocumentListSchema = z
  .record(z.string().describe("ID of the owner shape"), DocOutputSchema)
  .describe("Record of owner shape IDs to their corresponding document operations.");

export type DocumentListType = z.infer<typeof DocumentListSchema>;
