import { describe, test, expect } from "vitest";
import { generateShapeLink, parseShapeLink } from "./textLink";

describe("parseShapeLink", () => {
  test("should retrieve IDs from link text", () => {
    expect(parseShapeLink("https://example.com")).toEqual(undefined);
    expect(parseShapeLink("[FOLLY]:[AAA]:[]")).toEqual(undefined);
    expect(parseShapeLink("[FOLLY]:[]:[BBB]")).toEqual(undefined);
    expect(parseShapeLink(generateShapeLink("AAA", ["BBB"]))).toEqual({ sheetId: "AAA", shapeIds: ["BBB"] });
    expect(parseShapeLink(generateShapeLink("AAA", ["BBB", "CCC"]))).toEqual({
      sheetId: "AAA",
      shapeIds: ["BBB", "CCC"],
    });
  });
});
