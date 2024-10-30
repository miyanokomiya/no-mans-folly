import { describe, test, expect } from "vitest";
import { parseTerminologies } from "./terminology";
import { i18n } from "../i18n";

describe("parseTerminologies", () => {
  test("should parse terminology information", () => {
    expect(parseTerminologies("This is [[FOLLY_SVG]] and [[unknown_key]].")).toEqual([
      { text: "This is " },
      {
        text: "Folly SVG",
        description: i18n.t("term.follysvg"),
      },
      { text: " and " },
      { text: "unknown_key" },
      { text: "." },
    ]);
  });

  test("should lownercase when a key contains (l)", () => {
    const result = parseTerminologies("[[WORKSPACE(l)]]");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("workspace");
  });
});
