import { i18n } from "../i18n";

export type TerminologyItem = {
  text: string;
  description?: string;
};

const TERMINOLOGIES: { [key: string]: TerminologyItem } = {
  get WORKSPACE() {
    return {
      text: i18n.t("workspace"),
      description: i18n.t("term.workspace.desc"),
    };
  },
  get FOLLY_SVG() {
    return {
      text: "Folly SVG",
      description: i18n.t("term.follysvg"),
    };
  },
  get LOCK() {
    return {
      text: i18n.t("term.lock"),
      description: i18n.t("term.lock.desc"),
    };
  },
  get LINE_JUMP() {
    return {
      text: i18n.t("term.linejump"),
      description: i18n.t("term.linejump.desc"),
    };
  },
  get MAKE_POLYGON() {
    return {
      text: i18n.t("term.makepolygon"),
      description: i18n.t("term.makepolygon.desc"),
    };
  },
  get COMBINE_LINES() {
    return {
      text: i18n.t("term.combine_lines"),
      description: i18n.t("term.combine_lines.desc"),
    };
  },
  get ATTACH_LINE_VERTEX() {
    return {
      text: i18n.t("term.attach_vertex"),
      description: i18n.t("term.attach_vertex.desc"),
    };
  },
  get ATTACH_LINE_VERTICES() {
    return {
      text: i18n.t("term.attach_vertices"),
      description: i18n.t("term.attach_vertices.desc"),
    };
  },
  get PARSE_SVG() {
    return {
      text: i18n.t("term.parse_svg"),
      description: i18n.t("term.parse_svg.desc"),
    };
  },
  get SHEET_TO_SHAPE() {
    return {
      text: i18n.t("term.sheet_to_shape"),
      description: i18n.t("term.sheet_to_shape.desc"),
    };
  },
  get NOBOUNDS() {
    return {
      text: i18n.t("term.nobounds"),
      description: i18n.t("term.nobounds.desc"),
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
