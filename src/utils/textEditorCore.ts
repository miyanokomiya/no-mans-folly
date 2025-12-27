import { IRectangle } from "okageo";
import { DocAttributes, DocListValue, DocOutput } from "../models/document";

export interface DocCompositionItem {
  char: string; // A grapheme character
  bounds: IRectangle;
}

export interface DocCompositionLine {
  y: number;
  // refers line's height
  height: number;
  // refers font's height
  // When this is smaller than "height", this line has extra padding and its content needs to be centralized.
  fontheight: number;
  outputs: DocOutput;
  listInfo?: ListInfo;
}

export interface DocCompositionInfo {
  composition: DocCompositionItem[];
  lines: DocCompositionLine[];
}

export type InlineGroupItem = { bounds: IRectangle; text: string; attributes: DocAttributes };
export type ListIndexItem = [list: DocListValue, index: number];

export type ListInfo = { head: string; padding: number };

/**
 * A letter refers to a grapheme
 */
export type WordItem = [letter: string, width: number, attrs?: DocAttributes][];
export type LineItem = [words: WordItem[], ListInfo?];
export type BlockItem = [lines: LineItem[], attrs?: DocAttributes];

export const BULLET_PREFIXES = ["•", "◦", "▪"];

export const LINK_STYLE_ATTRS: DocAttributes = { underline: true, color: "#3b82f6" };

export const DEFAULT_FONT_SIZE = 14;
export const DEFAULT_LINEHEIGHT = 1.2;

export const LOD_THRESHOLD = 6;

/**
 * Don't change these values casually, or the result of text rendering changes.
 */
export const TEXT_ADJUSTMENTS = {
  // This isn't after any rule or theory but just a look-good value for locating letters to the center.
  textTop: 0.8,
  lineWidth: 0.07,
  underlineTop: 0.9,
  strikeTop: 0.5,
};

export const URL_TEXT_REG = /https?:\/\/[^\s]+/;
export const URL_TEXT_EXACT_REG = /^https?:\/\/[^\s]+/;

export const ORDERED_LIST_PATTERN = /^(\d+\.)\s/;
export const BULLET_LIST_PATTERN = /^([-*•])\s/;

export const BLOCK_MARKER_TRIGGER = / |\t/;
export const WORDBREAK = /\n|\t|[ -/]|[:-@]|[[-`]/;
export const LINEBREAK = /\n|\r\n/;
