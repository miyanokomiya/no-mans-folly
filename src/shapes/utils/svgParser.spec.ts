import { describe, test, expect } from "vitest";
import { parseSvgElement, parseSegmentRawPathsAsSimplePaths, ParserContext, parseSvgElementTree } from "./svgParser";
import { RectangleShape } from "../rectangle";
import { LinePolygonShape } from "../polygons/linePolygon";
import { parsePathSegmentRaws } from "okageo";
import { parseRGBA } from "../../utils/color";
import { createSVGElement } from "../../utils/svgElements";

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
    getRenderingColor: (str) => parseRGBA(str),
    setTextContent: (id: string, val: string) => {
      textContentMap.set(id, val);
    },
    getElementById: () => undefined,
    useRouteSet: new Set(),
  };
};

describe("parseSvgElement", () => {
  test("should parse SVG element with rectangle", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "rect",
        attributes: {
          x: "10",
          y: "20",
          width: "100",
          height: "80",
          fill: "blue",
        },
      },
    ]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    const shape = shapes[0] as RectangleShape;
    expect(shape.type).toBe("rounded_rectangle");
    expect(shape.width).toBe(100);
    expect(shape.height).toBe(80);
    expect(shape.fill.color).toBeDefined();
  });

  test("should parse SVG element with circle", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "circle",
        attributes: {
          cx: "100",
          cy: "100",
          r: "50",
          fill: "red",
        },
      },
    ]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("ellipse");
    expect((shapes[0] as any).rx).toBe(50);
    expect((shapes[0] as any).ry).toBe(50);
    expect((shapes[0] as any).fill.color).toBeDefined();
  });

  test("should parse SVG element with ellipse", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "ellipse",
        attributes: {
          cx: "100",
          cy: "100",
          rx: "70",
          ry: "50",
          fill: "green",
        },
      },
    ]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("ellipse");
    expect((shapes[0] as any).rx).toBe(70);
    expect((shapes[0] as any).ry).toBe(50);
    expect((shapes[0] as any).fill.color).toBeDefined();
  });

  test("should parse SVG element with line", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "line",
        attributes: {
          x1: "10",
          y1: "20",
          x2: "100",
          y2: "80",
          stroke: "black",
          "stroke-width": "2",
        },
      },
    ]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("line");
    expect((shapes[0] as any).p).toEqual({ x: 10, y: 20 });
    expect((shapes[0] as any).q).toEqual({ x: 100, y: 80 });
    expect((shapes[0] as any).stroke.color).toBeDefined();
    expect((shapes[0] as any).stroke.width).toBe(2);
  });

  test("should parse SVG element with path", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "path",
        attributes: {
          d: "M10,20 L100,20 L100,80 L10,80 Z",
          fill: "yellow",
        },
      },
    ]);
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

  test("should parse SVG element with path: begins without M command", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "path",
        attributes: { d: "L10,20 L100,20 L100,80" },
      },
    ]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(1);
    const shape = shapes[0] as LinePolygonShape;
    expect(shape.type).toBe("line_polygon");
    expect(shape.path).toEqual({
      path: [
        { x: 0, y: 0 },
        { x: 90, y: 0 },
        { x: 90, y: 60 },
      ],
    });
  });

  test("should parse SVG element with path: multiple paths", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "path",
        attributes: { d: "M10,20 l10,0 l0,10Z M110,20 l20,0 l0,20Z" },
      },
    ]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(2);
    const shape0 = shapes[0] as LinePolygonShape;
    expect(shape0.type).toBe("line_polygon");
    expect(shape0.p).toEqualPoint({ x: 10, y: 20 });
    expect(shape0.path).toEqual({
      path: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 0 },
      ],
    });
    const shape1 = shapes[1] as LinePolygonShape;
    expect(shape1.type).toBe("line_polygon");
    expect(shape1.p).toEqualPoint({ x: 110, y: 20 });
    expect(shape1.path).toEqual({
      path: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 0 },
      ],
    });
  });

  test("should parse SVG element with group", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "g",
        attributes: {},
        children: [
          {
            tag: "rect",
            attributes: {
              x: "10",
              y: "20",
              width: "100",
              height: "80",
              fill: "blue",
            },
          },
          {
            tag: "circle",
            attributes: {
              cx: "150",
              cy: "50",
              r: "30",
              fill: "red",
            },
          },
        ],
      },
    ]);

    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());

    // Should have 3 shapes: 1 group + 2 children
    expect(shapes.length).toBeGreaterThan(1);
    // First shape should be a group
    expect(shapes[0].type).toBe("group");
  });

  test("should dissolve group with single child", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "g",
        attributes: {},
        children: [
          {
            tag: "rect",
            attributes: {
              x: "10",
              y: "20",
              width: "100",
              height: "80",
              fill: "blue",
            },
          },
        ],
      },
    ]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("rounded_rectangle");
  });

  test("should dissolve group with single child: multiple hierarchy", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "g",
        attributes: {},
        children: [
          {
            tag: "g",
            attributes: {},
            children: [
              {
                tag: "rect",
                attributes: {
                  x: "10",
                  y: "20",
                  width: "100",
                  height: "80",
                  fill: "blue",
                },
              },
            ],
          },
        ],
      },
    ]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("rounded_rectangle");
  });

  test("should dissolve group with single child: dissolve child group", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "g",
        attributes: {},
        children: [
          {
            tag: "g",
            attributes: {},
            children: [
              {
                tag: "rect",
                attributes: {
                  x: "10",
                  y: "20",
                  width: "100",
                  height: "80",
                  fill: "blue",
                },
              },
            ],
          },
          {
            tag: "rect",
            attributes: {
              x: "40",
              y: "20",
              width: "100",
              height: "80",
              fill: "blue",
            },
          },
        ],
      },
    ]);
    const shapes = parseSvgElement(svgElement, getElementContext(), getParserContext());
    expect(shapes).toHaveLength(3);
    expect(shapes[0].type).toBe("group");
    expect(shapes[1].parentId).toBe(shapes[0].id);
    expect(shapes[2].parentId).toBe(shapes[0].id);
  });

  test("should dissolve group with single child: empty group", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "g",
        attributes: {},
        children: [],
      },
    ]);
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

  test("should regard <use> element", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "defs",
        attributes: {},
        children: [
          {
            tag: "rect",
            attributes: { id: "rect_0", x: "10", y: "20", width: "100", height: "80" },
          },
        ],
      },
      {
        tag: "use",
        attributes: { id: "use_0", href: "#rect_0", x: "100", y: "200" },
      },
      {
        tag: "g",
        attributes: {},
        children: [
          {
            tag: "rect",
            attributes: { id: "rect_1", x: "20", y: "30", width: "100", height: "80" },
          },
          {
            tag: "use",
            attributes: { id: "use_1", href: "#rect_0", width: "300" },
          },
        ],
      },
    ]);
    const [shapes] = parseSvgElementTree(svgElement, getParserContext());
    expect(shapes).toHaveLength(4);
    expect(shapes[0].p).toEqualPoint({ x: 100, y: 200 });
    expect((shapes[0] as RectangleShape).width).toEqual(100);
    expect((shapes[0] as RectangleShape).height).toEqual(80);
    expect(shapes[3].p).toEqualPoint({ x: 10, y: 20 });
    expect((shapes[3] as RectangleShape).width).toEqual(300);
    expect((shapes[3] as RectangleShape).height).toEqual(80);
  });

  test("should avoid circular dependencies of <use> elements", () => {
    const svgElement = createSVGElement("svg", {}, [
      {
        tag: "defs",
        attributes: {},
        children: [
          {
            tag: "g",
            attributes: { id: "group" },
            children: [
              {
                tag: "rect",
                attributes: { id: "rect_1", x: "20", y: "30", width: "100", height: "80" },
              },
              {
                tag: "use",
                attributes: { id: "use_1", href: "#use_0", width: "300" },
              },
            ],
          },
        ],
      },
      {
        tag: "use",
        attributes: { id: "use_0", href: "#group", x: "100", y: "200" },
      },
    ]);
    const [shapes] = parseSvgElementTree(svgElement, getParserContext());
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("rounded_rectangle");
  });
});
