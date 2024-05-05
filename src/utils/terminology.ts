export type TerminologyItem = {
  text: string;
  description?: string;
};

export const TERMINOLOGY_KEYS = {
  FOLLY_SVG: "FOLLY_SVG",
};

const TERMINOLOGIES: { [key: string]: TerminologyItem } = {
  [TERMINOLOGY_KEYS.FOLLY_SVG]: {
    text: "Folly SVG",
    description:
      "Folly SVG contains meta data of shapes. You can restore the shapes by dropping Folly SVG to the canvas.",
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
