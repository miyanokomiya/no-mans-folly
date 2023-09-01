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
  color?: string;
  bold?: boolean;
  size?: number;
  font?: string;
  align?: "left" | "center" | "right";
  direction?: DocDirection;
};

export type DocDirection = "top" | "middle" | "bottom";

export interface DocAttrInfo {
  cursor?: DocAttributes;
  block?: DocAttributes;
}
