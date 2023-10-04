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

export type DocAttributes = {
  // inline
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  size?: number;
  font?: string;

  // block
  align?: "left" | "center" | "right";

  // doc
  direction?: DocDirection;
};

export type DocDirection = "top" | "middle" | "bottom";

export interface DocAttrInfo {
  cursor?: DocAttributes;
  block?: DocAttributes;
  doc?: DocAttributes;
}
