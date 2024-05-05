export type TerminologyItem = {
  text: string;
  description?: string;
};

const TERMINOLOGY_KEYS = {
  FOLLY_SVG: "FOLLY_SVG",
  LOCK: "LOCK",
};

const TERMINOLOGIES: { [key: string]: TerminologyItem } = {
  [TERMINOLOGY_KEYS.FOLLY_SVG]: {
    text: "Folly SVG",
    description:
      "Folly SVG contains meta data of shapes. You can restore the shapes by dropping Folly SVG to the canvas.",
  },
  [TERMINOLOGY_KEYS.LOCK]: {
    text: "Lock",
    description: "Prevents shapes from moving. You can still modify, resize or rotate locked shapes.",
  },
};

export function parseTerminologies(src: string): TerminologyItem[] {
  const list = src.split(/(\[\[.*?\]\])/g);
  return list.map((str) => {
    const key = str.match(/\[\[(.*?)\]\]/);
    if (!key) return { text: str };
    return TERMINOLOGIES[key[1]] ?? { text: key[1] };
  });
}
