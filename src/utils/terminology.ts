import { i18n } from "../i18n";

export type TerminologyItem = {
  text: string;
  description?: string;
};

const TERMINOLOGIES: { [key: string]: TerminologyItem } = {
  get WORKSPACE() {
    return {
      text: i18n.t("workspace"),
      description: i18n.t("term.workspace"),
    };
  },
  get FOLLY_SVG() {
    return {
      text: "Folly SVG",
      description:
        "Folly SVG contains meta data of shapes. You can restore the shapes by dropping Folly SVG to the canvas.",
    };
  },
  get LOCK() {
    return {
      text: "Lock",
      description: "Prevents shapes from moving. You can still modify, resize or rotate locked shapes.",
    };
  },
  get LINE_JUMP() {
    return {
      text: "Jump",
      description: "Jump over background lines. This works only between straight segments.",
    };
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
