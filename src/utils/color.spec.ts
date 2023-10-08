import { describe, test, expect } from "vitest";

import {
  hslaToHsva,
  hsvaToHsla,
  hsvaToRgba,
  parseHSLA,
  parseHSVA,
  parseRGBA,
  rednerHSLA,
  rednerHSVA,
  rednerRGBA,
  rgbaToHsva,
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
