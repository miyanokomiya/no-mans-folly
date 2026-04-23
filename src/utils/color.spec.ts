import { describe, test, expect } from "vitest";

import {
  COLORS,
  colorToHex,
  generateUIColorFromInteger,
  getIndexedColorFromText,
  getIndexedColorText,
  hslaToHsva,
  hsvaToHsla,
  hsvaToRgba,
  isIndexedColor,
  isPartialRGBA,
  parseHSLA,
  parseHSVA,
  parseRGBA,
  rednerHSLA,
  rednerHSVA,
  rednerRGBA,
  resolveColor,
  resolveColorText,
  resolveHexText,
  rgbaToHsva,
  toHexAndAlpha,
} from "./color";

describe("parseHSLA", () => {
  test("string -> HSLA", () => {
    expect(parseHSLA("hsla(1, 10%,20% , 0.3  )")).toEqual({
      h: 1,
      s: 0.1,
      l: 0.2,
      a: 0.3,
    });
  });
  test("clamp in range", () => {
    expect(parseHSLA("hsla(-10, 110%,-20% , 1.3  )")).toEqual({
      h: 0,
      s: 1,
      l: 0,
      a: 1,
    });
  });
});

describe("parseHSVA", () => {
  test("string -> HSVA", () => {
    expect(parseHSVA("hsva(1, 10%,20% , 0.3  )")).toEqual({
      h: 1,
      s: 0.1,
      v: 0.2,
      a: 0.3,
    });
  });
  test("clamp in range", () => {
    expect(parseHSVA("hsva(-10, 110%,-20% , 1.3  )")).toEqual({
      h: 0,
      s: 1,
      v: 0,
      a: 1,
    });
  });
});

describe("parseRGBA", () => {
  test("string -> RGBA", () => {
    expect(parseRGBA("rgba(10, 111,234 , 0.3  )")).toEqual({
      r: 10,
      g: 111,
      b: 234,
      a: 0.3,
    });
  });
  test("clamp in range", () => {
    expect(parseRGBA("rgba(-10, 310,-20 , 1.3  )")).toEqual({
      r: 0,
      g: 255,
      b: 0,
      a: 1,
    });
  });
});

describe("rednerHSLA", () => {
  test("HSLA -> string", () => {
    expect(
      rednerHSLA({
        h: 1,
        s: 0.1,
        l: 0.2,
        a: 0.3,
      }),
    ).toEqual("hsla(1,10%,20%,0.3)");
  });
});

describe("rednerHSVA", () => {
  test("HSVA -> string", () => {
    expect(
      rednerHSVA({
        h: 1,
        s: 0.1,
        v: 0.2,
        a: 0.3,
      }),
    ).toEqual("hsva(1,10%,20%,0.3)");
  });
});

describe("rednerRGBA", () => {
  test("RGBA -> string", () => {
    expect(
      rednerRGBA({
        r: 1,
        g: 4,
        b: 6,
        a: 0.3,
      }),
    ).toEqual("rgba(1,4,6,0.3)");
  });
});

describe("rgbaToHsva", () => {
  test("rgba -> hsva", () => {
    expect(rgbaToHsva({ r: 255, g: 0, b: 0, a: 0.9 })).toEqual({
      h: 0,
      s: 1,
      v: 1,
      a: 0.9,
    });
    expect(rgbaToHsva({ r: 0, g: 127.5, b: 0, a: 0.9 })).toEqual({
      h: 120,
      s: 1,
      v: 0.5,
      a: 0.9,
    });
  });
});

describe("hsvaToRgba", () => {
  test("hsva -> rgba", () => {
    expect(hsvaToRgba({ h: 0, s: 1, v: 1, a: 0.9 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0.9,
    });
    expect(hsvaToRgba({ h: 120, s: 1, v: 0.5, a: 0.9 })).toEqual({
      r: 0,
      g: 127.5,
      b: 0,
      a: 0.9,
    });
  });
  test("should clump hue circulary", () => {
    expect(hsvaToRgba({ h: -360, s: 1, v: 1, a: 1 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    });
    expect(hsvaToRgba({ h: 720, s: 1, v: 1, a: 1 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    });
  });
});

describe("hslaToHsva", () => {
  test("to hsva", () => {
    expect(
      hslaToHsva({
        h: 20,
        s: 1,
        l: 0.5,
        a: 0.9,
      }),
    ).toEqual({
      h: 20,
      s: 1,
      v: 1,
      a: 0.9,
    });
  });
});

describe("hsvaToHsla", () => {
  test("to hsla", () => {
    expect(
      hsvaToHsla({
        h: 20,
        s: 1,
        v: 1,
        a: 0.9,
      }),
    ).toEqual({
      h: 20,
      s: 1,
      l: 0.5,
      a: 0.9,
    });
  });
});

describe("colorToHex", () => {
  test("should return hex value", () => {
    expect(colorToHex({ r: 1, g: 2, b: 3, a: 1 })).toBe("#010203");
    expect(colorToHex({ r: 1, g: 2, b: 3, a: 0.5 }), "ignore alpha value").toBe("#010203");
    expect(colorToHex({ r: 1.4, g: 2.3, b: 2.9, a: 1 }), "round float value").toBe("#010203");
  });
});

describe("toHexAndAlpha", () => {
  test("should parse RGBA format", () => {
    expect(toHexAndAlpha("rgba(1,2,3,0.5)")).toEqual(["#010203", 0.5]);
  });
  test("should parse HEX format", () => {
    expect(toHexAndAlpha("#010203")).toEqual(["#010203", 1]);
  });
});

describe("generateUIColorFromInteger", () => {
  test("should return color based on the value", () => {
    const res0 = generateUIColorFromInteger(0);
    const res1 = generateUIColorFromInteger(1);
    const res2 = generateUIColorFromInteger(2);
    expect(res0).not.toEqual(res1);
    expect(res0).not.toEqual(res2);
    expect(res0).toEqual(generateUIColorFromInteger(0));
  });
});

describe("isIndexedColor", () => {
  test("should return true when the value is indexed color", () => {
    expect(isIndexedColor({ index: -1 }), "invalid as index but still treated as indexed color").toBe(true);
    expect(isIndexedColor({ index: 0 })).toBe(true);
    expect(isIndexedColor({ index: 1 })).toBe(true);
    expect(isIndexedColor({ r: 255, g: 100, b: 10, a: 1 })).toBe(false);
    expect(isIndexedColor({ r: 255, g: 100, b: 10, a: 1, index: 0 })).toBe(true);
  });
});

describe("isPartialRGBA", () => {
  test("should return true when the value is indexed color", () => {
    expect(isPartialRGBA({ index: -1 }), "invalid as index but still treated as indexed color").toBe(false);
    expect(isPartialRGBA({ index: 0 })).toBe(false);
    expect(isPartialRGBA({ index: 1 })).toBe(false);
    expect(isPartialRGBA({ r: 255 })).toBe(true);
    expect(isPartialRGBA({ a: 0 })).toBe(true);
    expect(isPartialRGBA({ g: 1, index: 0 })).toBe(false);
  });
});

describe("resolveColor", () => {
  const palette = [COLORS.WHITE, COLORS.GRAY_1];
  test("should resolve indexed color", () => {
    expect(resolveColor({ index: 0 }, palette)).toEqual(palette[0]);
    expect(resolveColor({ index: 1 }, palette)).toEqual(palette[1]);
    expect(resolveColor({ index: 10 }, palette)).toEqual(COLORS.BLACK);
    expect(resolveColor(COLORS.YELLOW, palette)).toEqual(COLORS.YELLOW);
  });
});

describe("resolveColorText", () => {
  const palette = [COLORS.WHITE, COLORS.GRAY_1];
  test("should resolve indexed color", () => {
    expect(resolveColorText("rgba(1,2,3,0)", palette)).toEqual({ r: 1, g: 2, b: 3, a: 0 });
    expect(resolveColorText("indexed-color_1", palette)).toEqual(palette[1]);
    expect(resolveColorText("xxx", palette)).toEqual(undefined);
  });
});

describe("getIndexedColorText", () => {
  test("should return text representation of an indexed color", () => {
    expect(getIndexedColorText(0)).toBe("indexed-color_0");
    expect(getIndexedColorText(1)).toBe("indexed-color_1");
    expect(getIndexedColorText(10)).toBe("indexed-color_10");
  });
});

describe("getIndexedColorFromText", () => {
  test("should return the index from a text representation", () => {
    expect(getIndexedColorFromText("indexed-color_0")).toBe(0);
    expect(getIndexedColorFromText("indexed-color_1")).toBe(1);
    expect(getIndexedColorFromText("indexed-color_10")).toBe(10);
    expect(getIndexedColorFromText("xxx_10"), "fallback to zero when invalid").toBe(0);
  });
});

describe("resolveHexText", () => {
  const palette = [COLORS.WHITE, COLORS.GRAY_1];
  test("should resolve indexed color", () => {
    expect(resolveHexText("#001122", palette)).toBe("#001122");
    expect(resolveHexText("indexed-color_1", palette)).toBe("#bfbfbf");
    expect(resolveHexText("indexed-color_10", palette)).toBe("");
  });
});
