export type DocOutput = DocDeltaInsert[];
export type DocDelta = DocDeltaOp[];

export type DocDeltaOp = DocDeltaInsert | DocDeltaDelete | DocDeltaRetain;

export interface DocDeltaInsert {
  insert: string;
  attributes?: DocAttributes;
}

export interface DocDeltaDelete {
  delete: number;
}

export interface DocDeltaRetain {
  retain: number;
  attributes?: DocAttributes;
}

/**
 * To remove a attribute, need to set "null".
 * => "undefined" doesn't work with delta lib.
 */
export type DocAttributes = {
  // inline
  color?: string | null;
  background?: string | null; // format: rgba(r,g,b,a)
  bold?: boolean | null;
  italic?: boolean | null;
  underline?: boolean | null;
  strike?: boolean | null;
  size?: number | null;
  font?: string | null;
  link?: string | null;
} & DocAttributesBlock &
  DocAttributesDoc;

export type DocAttributesBlock = {
  align?: "left" | "center" | "right" | null;
  lineheight?: number | null; // equivalent to unitless value in CSS
  list?: DocListValue | null;
  indent?: number | null; // 0-based indentation level. "undefined" should mean "0"
};

export type DocAttributesDoc = {
  direction?: DocDirection | null;
};

export type DocDirection = "top" | "middle" | "bottom";
export type DocListValue = "bullet" | "ordered" | "empty";

export interface DocAttrInfo {
  cursor?: DocAttributes;
  block?: DocAttributes;
  doc?: DocAttributes;
}

export interface EmojiData {
  id: string;
  native: string;
}
