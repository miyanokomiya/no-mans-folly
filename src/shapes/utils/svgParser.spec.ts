import { describe, test, expect } from "vitest";
import { parseSvgElement, parseSegmentRawPathsAsSimplePaths, ParserContext } from "./svgParser";
import { RectangleShape } from "../rectangle";
import { LinePolygonShape } from "../polygons/linePolygon";
import { parsePathSegmentRaws } from "okageo";

const createMockSVGElement = (
  tagName: string,
  attributes: Record<string, string> = {},
  children: SVGElement[] = [],
): SVGElement => {
  return {
    tagName,
    getAttribute: (name: string) => attributes[name] || null,
    children,
  } as unknown as SVGElement;
};

const getElementContext = () => ({
  style: {
    fill: false,
    fillGlobalAlpha: 1,
    fillStyle: "",
    lineCap: "butt",
    lineDash: [],
    lineJoin: "bevel",
    lineWidth: 1,
    stroke: false,
    strokeGlobalAlpha: 1,
    strokeStyle: "",
  },
});

const getParserContext = (): ParserContext => {
  let count = 0;
  const textContentMap = new Map<string, string>();
  return {
    generateId: () => `id_${count++}`,
    setTextContent: (id: string, val: string) => {
      textContentMap.set(id, val);
    },
  };
};

describe("parseSvgElement", () => {
  test("should parse SVG element with rectangle", () => {
    const rectElement = createMockSVGElement("rect", {
      x: "10",
      y: "20",
      width: "100",
      height: "80",
      fill: "blue",
    });

    const svgElement = createMockSVGElement("svg", {}, [rectElement]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    const shape = shapes[0] as RectangleShape;
    expect(shape.type).toBe("rounded_rectangle");
    expect(shape.width).toBe(100);
    expect(shape.height).toBe(80);
    expect(shape.fill.color).toBeDefined();
  });

  test("should parse SVG element with circle", () => {
    const circleElement = createMockSVGElement("circle", {
      cx: "100",
      cy: "100",
      r: "50",
      fill: "red",
    });

    const svgElement = createMockSVGElement("svg", {}, [circleElement]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("ellipse");
    expect((shapes[0] as any).rx).toBe(50);
    expect((shapes[0] as any).ry).toBe(50);
    expect((shapes[0] as any).fill.color).toBeDefined();
  });

  test("should parse SVG element with ellipse", () => {
    const ellipseElement = createMockSVGElement("ellipse", {
      cx: "100",
      cy: "100",
      rx: "70",
      ry: "50",
      fill: "green",
    });

    const svgElement = createMockSVGElement("svg", {}, [ellipseElement]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("ellipse");
    expect((shapes[0] as any).rx).toBe(70);
    expect((shapes[0] as any).ry).toBe(50);
    expect((shapes[0] as any).fill.color).toBeDefined();
  });

  test("should parse SVG element with line", () => {
    const lineElement = createMockSVGElement("line", {
      x1: "10",
      y1: "20",
      x2: "100",
      y2: "80",
      stroke: "black",
      "stroke-width": "2",
    });

    const svgElement = createMockSVGElement("svg", {}, [lineElement]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("line");
    expect((shapes[0] as any).p).toEqual({ x: 10, y: 20 });
    expect((shapes[0] as any).q).toEqual({ x: 100, y: 80 });
    expect((shapes[0] as any).stroke.color).toBeDefined();
    expect((shapes[0] as any).stroke.width).toBe(2);
  });

  test("should parse SVG element with path", () => {
    const pathElement = createMockSVGElement("path", {
      d: "M10,20 L100,20 L100,80 L10,80 Z",
      fill: "yellow",
    });

    const svgElement = createMockSVGElement("svg", {}, [pathElement]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(1);
    const shape = shapes[0] as LinePolygonShape;
    expect(shape.type).toBe("line_polygon");
    expect(shape.path).toEqual({
      path: [
        { x: 0, y: 0 },
        { x: 90, y: 0 },
        { x: 90, y: 60 },
        { x: 0, y: 60 },
        { x: 0, y: 0 },
      ],
    });
  });

  test("should parse SVG element with group", () => {
    const rectElement = createMockSVGElement("rect", {
      x: "10",
      y: "20",
      width: "100",
      height: "80",
      fill: "blue",
    });

    const circleElement = createMockSVGElement("circle", {
      cx: "150",
      cy: "50",
      r: "30",
      fill: "red",
    });

    const groupElement = createMockSVGElement("g", {}, [rectElement, circleElement]);
    const svgElement = createMockSVGElement("svg", {}, [groupElement]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    // Should have 3 shapes: 1 group + 2 children
    expect(shapes.length).toBeGreaterThan(1);
    // First shape should be a group
    expect(shapes[0].type).toBe("group");
  });

  test("should dissolve group with single child", () => {
    const rectElement = createMockSVGElement("rect", {
      x: "10",
      y: "20",
      width: "100",
      height: "80",
      fill: "blue",
    });

    const groupElement = createMockSVGElement("g", {}, [rectElement]);
    const svgElement = createMockSVGElement("svg", {}, [groupElement]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("rounded_rectangle");
  });

  test("should dissolve group with single child: multiple hierarchy", () => {
    const rectElement = createMockSVGElement("rect", {
      x: "10",
      y: "20",
      width: "100",
      height: "80",
      fill: "blue",
    });

    const groupElement1 = createMockSVGElement("g", {}, [rectElement]);
    const groupElement2 = createMockSVGElement("g", {}, [groupElement1]);
    const svgElement = createMockSVGElement("svg", {}, [groupElement2]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("rounded_rectangle");
  });

  test("should dissolve group with single child: dissolve child group", () => {
    const rectElement1 = createMockSVGElement("rect", {
      x: "10",
      y: "20",
      width: "100",
      height: "80",
      fill: "blue",
    });
    const rectElement2 = { ...rectElement1, x: "40" };

    const groupElement1 = createMockSVGElement("g", {}, [rectElement1]);
    const groupElement2 = createMockSVGElement("g", {}, [groupElement1, rectElement2]);
    const svgElement = createMockSVGElement("svg", {}, [groupElement2]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(3);
    expect(shapes[0].type).toBe("group");
    expect(shapes[1].parentId).toBe(shapes[0].id);
    expect(shapes[2].parentId).toBe(shapes[0].id);
  });

  test("should dissolve group with single child: empty group", () => {
    const groupElement = createMockSVGElement("g", {}, []);
    const svgElement = createMockSVGElement("svg", {}, [groupElement]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(0);
  });
});

describe("parseSegmentRawPathsAsSimplePaths", () => {
  test("should parse a simple path with straight lines", () => {
    const rawPath = parsePathSegmentRaws("M10,20 L30,40 L50,60 Z");
    const simplePath = parseSegmentRawPathsAsSimplePaths(rawPath);

    expect(simplePath).toEqual({
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
        { x: 10, y: 20 },
      ],
    });
    expect(simplePath, "should regard lower command").toEqual(
      parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,20 l20,20 l20,20 z")),
    );
  });

  test("should parse a simple path with directional lines", () => {
    const rawPath = parsePathSegmentRaws("M10,20 H30 V50 Z");
    const simplePath = parseSegmentRawPathsAsSimplePaths(rawPath);

    expect(simplePath).toEqual({
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 20 },
        { x: 30, y: 50 },
        { x: 10, y: 20 },
      ],
    });
    expect(simplePath, "should regard lower command").toEqual(
      parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,20 h20 v30 z")),
    );
  });

  test("should parse a path with cubic Bezier curves", () => {
    const rawPath = parsePathSegmentRaws("M10,20 C15,25 25,35 30,40");
    const simplePath = parseSegmentRawPathsAsSimplePaths(rawPath);

    expect(simplePath).toEqual({
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      curves: [
        {
          c1: { x: 15, y: 25 },
          c2: { x: 25, y: 35 },
        },
      ],
    });

    expect(simplePath, "should regard lower command").toEqual(
      parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,20 c5,5 15,15 20,20")),
    );
  });

  test("should parse a path with short cubic Bezier curves", () => {
    const expected = parseSegmentRawPathsAsSimplePaths(
      parsePathSegmentRaws("M10,10 C15,5 25,15 30,10 C35,5 50,15 60,40"),
    );
    expect(parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,10 C15,5 25,15 30,10 S50,15 60,40"))).toEqual(
      expected,
    );
    expect(
      parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,10 C15,5 25,15 30,10 s20,5 30,30")),
      "should regard lowser command",
    ).toEqual(expected);
  });

  test("should parse a path with quadratic Bezier curves", () => {
    const rawPath = parsePathSegmentRaws("M10,20 Q15,25 30,40");
    const simplePath = parseSegmentRawPathsAsSimplePaths(rawPath);

    expect(simplePath).toEqual({
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      curves: [expect.anything()],
    });
    expect(simplePath.curves![0]!.c1).toEqualPoint({ x: 10 + (5 * 2) / 3, y: 20 + (5 * 2) / 3 });
    expect(simplePath.curves![0]!.c2).toEqualPoint({ x: 30 + (-15 * 2) / 3, y: 40 + (-15 * 2) / 3 });

    expect(simplePath, "should regard lower command").toEqual(
      parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,20 q5,5 20,20")),
    );
  });

  test("should parse a path with short quadratic Bezier curves", () => {
    const expected = parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,10 Q25,15 30,10 Q35,5 60,40"));
    const result0 = parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,10 Q25,15 30,10 T60,40"));
    expect(result0.path).toEqualPoints(expected.path);
    expect(result0.curves![1]!.c1).toEqualPoint(expected.curves![1]!.c1);
    expect(result0.curves![1]!.c2).toEqualPoint(expected.curves![1]!.c2);

    const result1 = parseSegmentRawPathsAsSimplePaths(parsePathSegmentRaws("M10,10 Q25,15 30,10 t30,30"));
    expect(result1.path).toEqualPoints(expected.path);
    expect(result1.curves![1]!.c1).toEqualPoint(expected.curves![1]!.c1);
    expect(result1.curves![1]!.c2).toEqualPoint(expected.curves![1]!.c2);
  });

  test("should parse a path with arcs", () => {
    const rawPath = parsePathSegmentRaws("M10,20 A40,40 0 0,1 30,40");
    const simplePath = parseSegmentRawPathsAsSimplePaths(rawPath);
    expect(simplePath.path[0]).toEqualPoint({ x: 10, y: 20 });
    expect(simplePath.path.at(-1)!).toEqualPoint({ x: 30, y: 40 });
  });

  test("should handle an empty path", () => {
    const rawPath = parsePathSegmentRaws("");
    const simplePath = parseSegmentRawPathsAsSimplePaths(rawPath);

    expect(simplePath).toEqual({ path: [] });
  });
});
