export type TerminologyItem = {
  text: string;
  description?: string;
};

const TERMINOLOGY_KEYS = {
  WORKSPACE: "WORKSPACE",
  FOLLY_SVG: "FOLLY_SVG",
  LOCK: "LOCK",
};

const TERMINOLOGIES: { [key: string]: TerminologyItem } = {
  [TERMINOLOGY_KEYS.WORKSPACE]: {
    text: "Workspace",
    description:
      'A workspace is a folder where a diagram data is saved. Each sheet is saved as a separate file. All asset files are saved in the "assets" folder.',
  },
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
  return list
    .filter((str) => str)
    .map((str) => {
      const keyMatched = str.match(/\[\[(.*?)\]\]/);
      if (!keyMatched) return { text: str };

      const modifierMatched = keyMatched[1].match(/(\(.*?\))/);
      if (!modifierMatched) return TERMINOLOGIES[keyMatched[1]] ?? { text: keyMatched[1] };

      const rawKey = keyMatched[1].replace(modifierMatched[1], "");
      const item = TERMINOLOGIES[rawKey] ?? { text: rawKey };
      const text = modifierMatched[1].includes("l") ? item.text.toLowerCase() : item.text;
      return { ...item, text };
    });
}
