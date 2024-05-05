import { describe, test, expect } from "vitest";
import { parseTerminologies } from "./terminology";

describe("parseTerminologies", () => {
  test("should parse terminology information", () => {
    expect(parseTerminologies("This is [[FOLLY_SVG]] and [[unknown_key]].")).toEqual([
      { text: "This is " },
      {
        text: "Folly SVG",
        description:
          "Folly SVG contains meta data of shapes. You can restore the shapes by dropping Folly SVG to the canvas.",
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
