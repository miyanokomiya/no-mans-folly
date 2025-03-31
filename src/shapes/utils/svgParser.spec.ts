import { describe, test, expect, beforeEach } from "vitest";
import { parseSvgElement, applyTransformToShape } from "./svgParser";
import { Shape } from "../../models";
import { RectangleShape } from "../rectangle";
import { LinePolygonShape } from "../polygons/linePolygon";

// Mock DOMParser for testing
class MockDOMParser {
  parseFromString(_text: string, _type: string) {
    const mockDoc = {
      documentElement: {
        tagName: "svg",
        getAttribute: () => null,
        children: [],
        querySelector: () => null,
      } as unknown as SVGElement,
    };
    return mockDoc;
  }
}

// Mock SVG elements for testing
const createMockSVGElement = (
  tagName: string,
  attributes: Record<string, string> = {},
  children: SVGElement[] = [],
): SVGElement => {
  return {
    tagName,
    getAttribute: (name: string) => attributes[name] || null,
    children,
    querySelector: () => null,
  } as unknown as SVGElement;
};

// Setup global mocks
beforeEach(() => {
  global.DOMParser = MockDOMParser as any;
});

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

    const shapes = parseSvgElement(svgElement);

    expect(shapes).toHaveLength(1);
    const shape = shapes[0] as RectangleShape;
    expect(shape.type).toBe("rectangle");
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

    const shapes = parseSvgElement(svgElement);

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

    const shapes = parseSvgElement(svgElement);

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

    const shapes = parseSvgElement(svgElement);

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
    const shapes = parseSvgElement(svgElement);
    expect(shapes).toHaveLength(1);
    const shape = shapes[0] as LinePolygonShape;
    expect(shape.type).toBe("line_polygon");
    expect(shape.path).toEqual({
      path: [
        { x: 10, y: 20 },
        { x: 100, y: 20 },
        { x: 100, y: 80 },
        { x: 10, y: 80 },
        { x: 10, y: 20 },
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

    const shapes = parseSvgElement(svgElement);

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

    const shapes = parseSvgElement(svgElement);

    // Should have 1 shape (the rect) since the group is dissolved
    expect(shapes).toHaveLength(1);
    expect(shapes[0].type).toBe("rectangle");
  });
});

describe("applyTransformToShape", () => {
  test("should apply transform to shape", () => {
    const shape: Shape = {
      id: "test",
      findex: "",
      type: "rectangle",
      p: { x: 10, y: 20 },
      rotation: 0,
    };

    // Add width and height properties
    (shape as any).width = 100;
    (shape as any).height = 80;

    // Create an affine matrix for translation (50, 30) and rotation (45 degrees)
    const angle = Math.PI / 4; // 45 degrees
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const affine: [number, number, number, number, number, number] = [cos, sin, -sin, cos, 50, 30];

    applyTransformToShape(shape, affine);

    // Check that the transform was applied
    expect(shape.p.x).toBeCloseTo(10 + 50);
    expect(shape.p.y).toBeCloseTo(20 + 30);
    expect(shape.rotation).toBeCloseTo(angle);

    // Check that scaling was applied
    const scale = Math.sqrt(cos * cos + sin * sin);
    expect((shape as any).width).toBeCloseTo(100 * scale);
    expect((shape as any).height).toBeCloseTo(80 * scale);
  });
});
