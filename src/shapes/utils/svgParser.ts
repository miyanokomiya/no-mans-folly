import {
  AffineMatrix,
  ISvgStyle,
  parseTransform,
  parsePathSegmentRaws,
  PathSegmentRaw,
  add,
  multi,
  sub,
  getSymmetry,
  multiAffine,
} from "okageo";
import { Shape, Color, CommonStyle } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { generateUuid } from "../../utils/random";
import { LinePolygonShape } from "../polygons/linePolygon";
import { SimplePath } from "../simplePolygon";
import { shiftBezierCurveControl } from "../../utils/path";
import { getCurveSplineBounds } from "../../utils/geometry";
import { hexToColor, parseRGBA } from "../../utils/color";
import { arcToCubicCurves } from "../../utils/arc"; // Import utility for arc conversion
import { getCommonStruct, resizeShape } from "..";

/**
 * Parse SVG file and convert to shape data
 * @param file SVG file
 * @returns Promise that resolves with an array of shape data objects
 */
export async function parseSvgFile(file: File | Blob): Promise<Shape[]> {
  try {
    const text = await readFileAsText(file);
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(text, "image/svg+xml");
    const svgElement = svgDoc.documentElement as unknown as SVGElement;
    return parseSvgElement(
      svgElement,
      getElementContext(svgElement, undefined, {
        // Set default style of SVG elements
        style: {
          fill: true,
          fillGlobalAlpha: 1,
          fillStyle: "rgb(0, 0, 0)",
          lineCap: "butt",
          lineDash: [],
          lineJoin: "bevel",
          lineWidth: 1,
          stroke: true,
          strokeGlobalAlpha: 1,
          strokeStyle: "rgb(0, 0, 0)",
        },
      }),
    );
  } catch (err) {
    console.error("SVG import error:", err);
    throw err;
  }
}

/**
 * Read a file as text
 * @param file File to read
 * @returns Promise that resolves with the file content as text
 */
function readFileAsText(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Generate a unique ID for a shape
 * @returns Unique ID string
 */
function generateId(): string {
  return generateUuid();
}

function getCommonStyle(style: ISvgStyle): CommonStyle {
  const fill = createFillStyle({
    disabled: !style.fill,
    color: convertSvgColorToShapeColor(style.fillStyle, style.fillGlobalAlpha),
  });

  const stroke = createStrokeStyle({
    disabled: !style.stroke,
    color: convertSvgColorToShapeColor(style.strokeStyle, style.strokeGlobalAlpha),
    width: style.lineWidth,
    dash: convertSvgLineDashToShapeDash(style.lineDash),
    lineCap: style.lineCap as CanvasLineCap,
    lineJoin: style.lineJoin as CanvasLineJoin,
  });

  return { fill, stroke };
}

/**
 * Convert SVG color to shape color
 * @param colorStr SVG color string
 * @param alpha Alpha value
 * @returns Shape color object
 */
function convertSvgColorToShapeColor(colorStr: string, alpha: number = 1): Color {
  // Default color (black)
  const defaultColor: Color = { r: 0, g: 0, b: 0, a: alpha };

  if (!colorStr) {
    return defaultColor;
  }

  // Handle hex color
  if (colorStr.startsWith("#")) {
    return hexToColor(colorStr, alpha);
  }

  // Handle rgb/rgba color
  if (colorStr.startsWith("rgb")) {
    return rgbToColor(colorStr, alpha);
  }

  // Handle named colors (simplified)
  switch (colorStr.toLowerCase()) {
    case "black":
      return { r: 0, g: 0, b: 0, a: alpha };
    case "white":
      return { r: 255, g: 255, b: 255, a: alpha };
    case "red":
      return { r: 255, g: 0, b: 0, a: alpha };
    case "green":
      return { r: 0, g: 128, b: 0, a: alpha };
    case "blue":
      return { r: 0, g: 0, b: 255, a: alpha };
    case "yellow":
      return { r: 255, g: 255, b: 0, a: alpha };
    default:
      return defaultColor;
  }
}

/**
 * Convert rgb/rgba color string to color object
 * @param rgb RGB/RGBA color string
 * @param defaultAlpha Default alpha value
 * @returns Color object
 */
function rgbToColor(rgb: string, defaultAlpha: number = 1): Color {
  return parseRGBA(rgb, defaultAlpha) ?? { r: 0, g: 0, b: 0, a: defaultAlpha };
}

/**
 * Convert SVG line dash to shape dash
 * @param lineDash SVG line dash array
 * @returns Shape dash type
 */
function convertSvgLineDashToShapeDash(lineDash: number[]): "solid" | "dot" | "short" | "long" {
  if (!lineDash || lineDash.length === 0) {
    return "solid";
  }

  // Simple heuristic to determine dash type
  const sum = lineDash.reduce((a, b) => a + b, 0);
  const avg = sum / lineDash.length;

  if (avg <= 2) return "dot";
  if (avg <= 5) return "short";
  return "long";
}

type ElementContext = {
  transform?: AffineMatrix;
  style: ISvgStyle;
  parentId?: string;
};

function getElementContext(element: SVGElement, id: string | undefined, srcContext: ElementContext): ElementContext {
  const t = element.getAttribute("transform");
  const transform = t ? parseTransform(t) : undefined;

  return {
    transform:
      transform && srcContext.transform
        ? multiAffine(srcContext.transform, transform)
        : (transform ?? srcContext.transform),
    style: parseSvgElementStyle(element, srcContext.style),
    parentId: id,
  };
}

/**
 * Parse SVG element and convert to shape data
 * @param element SVG element
 * @param context Element context
 * @returns Array of shape data objects
 */
export function parseSvgElement(element: SVGElement, context: ElementContext): Shape[] {
  if (element.tagName.toLowerCase() === "svg") {
    // Process SVG root element
    const shapes: Shape[] = [];
    Array.from(element.children).forEach((child) => {
      const childShapes = parseSvgElement(child as SVGElement, context);
      shapes.push(...childShapes);
    });
    return shapes;
  } else if (element.tagName.toLowerCase() === "g") {
    // Process group element
    return handleGroupElement(element as SVGGElement, context);
  } else {
    // Process regular shape element
    const shape = convertElementToShape(element, context);
    return shape ? [shape] : [];
  }
}

/**
 * Handle SVG group element
 * @param groupElement SVG group element
 * @param context Element context
 * @returns Array of shape data objects. The first element is the target shape, followed by its children.
 */
function handleGroupElement(groupElement: SVGGElement, context: ElementContext): Shape[] {
  const groupContext = getElementContext(groupElement, undefined, context);

  // Parse all child elements first
  const childShapes: Shape[] = [];
  let directChildCount = 0;
  Array.from(groupElement.children).forEach((child) => {
    const shapes = parseSvgElement(child as SVGElement, groupContext);
    if (shapes.length > 0) directChildCount++;
    childShapes.push(...shapes);
  });

  // If there's only one direct child shape, dissolve the group
  if (directChildCount === 1) {
    delete childShapes[0].parentId;
    return childShapes;
  }

  // Otherwise, create a group with multiple children
  let groupShape: Shape = {
    id: generateId(),
    findex: "",
    type: "group",
    p: { x: 0, y: 0 },
    rotation: 0,
    parentId: context.parentId,
  };

  if (groupContext.transform) {
    const patch = resizeShape(getCommonStruct, groupShape, groupContext.transform);
    groupShape = { ...groupShape, ...patch };
  }

  return [groupShape, ...childShapes];
}

/**
 * Convert SVG element to shape data
 * @param element SVG element
 * @param context Element context
 * @returns Shape data object or null if conversion fails
 */
function convertElementToShape(element: SVGElement, context: ElementContext): Shape | undefined {
  let shape: Shape | undefined;

  switch (element.tagName.toLowerCase()) {
    case "rect":
      shape = convertRectElement(element as SVGRectElement);
      break;
    case "circle":
      shape = convertCircleElement(element as SVGCircleElement);
      break;
    case "ellipse":
      shape = convertEllipseElement(element as SVGEllipseElement);
      break;
    case "line":
      shape = convertLineElement(element as SVGLineElement);
      break;
    case "path":
      shape = convertPathElement(element as SVGPathElement);
      break;
    // Add more element types as needed
  }

  if (shape) {
    const shapeContext = getElementContext(element, undefined, context);
    const style = getCommonStyle(shapeContext.style);
    const patch = shapeContext.transform ? resizeShape(getCommonStruct, shape, shapeContext.transform) : undefined;
    shape = { ...shape, ...style, ...patch, parentId: context.parentId };
  }

  return shape;
}

/**
 * Convert SVG rect element to shape data
 * @param element SVG rect element
 * @returns Shape data object
 */
function convertRectElement(element: SVGRectElement): Shape {
  const x = parseFloat(element.getAttribute("x") || "0");
  const y = parseFloat(element.getAttribute("y") || "0");
  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");
  const rx = parseFloat(element.getAttribute("rx") || "0");
  const ry = parseFloat(element.getAttribute("ry") || `${rx}`);

  // Create shape data
  const shape: any = {
    id: generateId(),
    findex: "",
    type: rx > 0 || ry > 0 ? "rounded_rectangle" : "rectangle",
    p: { x, y },
    rotation: 0,
    width,
    height,
  };

  return shape;
}

/**
 * Convert SVG circle element to shape data
 * @param element SVG circle element
 * @returns Shape data object
 */
function convertCircleElement(element: SVGCircleElement): Shape {
  const cx = parseFloat(element.getAttribute("cx") || "0");
  const cy = parseFloat(element.getAttribute("cy") || "0");
  const r = parseFloat(element.getAttribute("r") || "0");

  // Create shape data
  const shape: any = {
    id: generateId(),
    findex: "",
    type: "ellipse",
    p: { x: cx - r, y: cy - r },
    rotation: 0,
    rx: r,
    ry: r,
  };

  return shape;
}

/**
 * Convert SVG ellipse element to shape data
 * @param element SVG ellipse element
 * @returns Shape data object
 */
function convertEllipseElement(element: SVGEllipseElement): Shape {
  const cx = parseFloat(element.getAttribute("cx") || "0");
  const cy = parseFloat(element.getAttribute("cy") || "0");
  const rx = parseFloat(element.getAttribute("rx") || "0");
  const ry = parseFloat(element.getAttribute("ry") || "0");

  // Create shape data
  const shape: any = {
    id: generateId(),
    findex: "",
    type: "ellipse",
    p: { x: cx - rx, y: cy - ry },
    rotation: 0,
    rx,
    ry,
  };

  return shape;
}

/**
 * Convert SVG line element to shape data
 * @param element SVG line element
 * @returns Shape data object
 */
function convertLineElement(element: SVGLineElement): Shape {
  const x1 = parseFloat(element.getAttribute("x1") || "0");
  const y1 = parseFloat(element.getAttribute("y1") || "0");
  const x2 = parseFloat(element.getAttribute("x2") || "0");
  const y2 = parseFloat(element.getAttribute("y2") || "0");

  // Create shape data
  const shape: any = {
    id: generateId(),
    findex: "",
    type: "line",
    p: { x: x1, y: y1 },
    q: { x: x2, y: y2 },
    rotation: 0,
  };

  return shape;
}

/**
 * Convert SVG path element to shape data
 * @param element SVG path element
 * @returns Shape data object or null if conversion fails
 */
function convertPathElement(element: SVGPathElement): Shape | undefined {
  const dAttr = element.getAttribute("d");
  if (!dAttr) return;

  const pathSegments = parsePathSegmentRaws(dAttr);
  const path = parseSegmentRawPathsAsSimplePaths(pathSegments);
  const bounds = getCurveSplineBounds(path.path, path.curves);
  const p = { x: bounds.x, y: bounds.y };
  const d = multi(p, -1);
  // Normalize the path based on the bounds.
  const normalizedPath = {
    path: path.path.map((v) => add(v, d)),
    curves: path.curves?.map((c) => (c ? shiftBezierCurveControl(c, d) : undefined)),
  };

  const shape: Omit<LinePolygonShape, "fill" | "stroke"> = {
    id: generateId(),
    findex: "",
    type: "line_polygon",
    p,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    polygonType: pathSegments.at(-1)?.[0].toLocaleLowerCase() === "z" ? undefined : 1,
    path: normalizedPath,
  };

  return shape;
}

/**
 * Parse SVG element style
 * @param element SVG element
 * @returns SVG style information
 */
function parseSvgElementStyle(element: SVGElement, parentStyle: ISvgStyle): ISvgStyle {
  const style: ISvgStyle = { ...parentStyle };

  // Parse style attribute
  const styleAttr = element.getAttribute("style");
  if (styleAttr) {
    // Parse style attribute
    const styleProps = styleAttr.split(";");
    styleProps.forEach((prop) => {
      const [key, value] = prop.split(":").map((s) => s.trim());
      if (key && value) {
        switch (key) {
          case "fill":
            if (value === "none") {
              style.fill = false;
            } else {
              style.fill = true;
              style.fillStyle = value;
            }
            break;
          case "fill-opacity":
            style.fillGlobalAlpha = parseFloat(value);
            break;
          case "stroke":
            if (value === "none") {
              style.stroke = false;
            } else {
              style.stroke = true;
              style.strokeStyle = value;
            }
            break;
          case "stroke-opacity":
            style.strokeGlobalAlpha = parseFloat(value);
            break;
          case "stroke-width":
            style.lineWidth = parseFloat(value);
            break;
          case "stroke-linecap":
            style.lineCap = value as any;
            break;
          case "stroke-linejoin":
            style.lineJoin = value as any;
            break;
          case "stroke-dasharray":
            if (value !== "none") {
              style.lineDash = value.split(",").map((v) => parseFloat(v.trim()));
            }
            break;
        }
      }
    });
  }

  // Parse individual style attributes
  const fill = element.getAttribute("fill");
  if (fill) {
    if (fill === "none") {
      style.fill = false;
    } else {
      style.fill = true;
      style.fillStyle = fill;
    }
  }

  const fillOpacity = element.getAttribute("fill-opacity");
  if (fillOpacity) {
    style.fillGlobalAlpha = parseFloat(fillOpacity);
  }

  const stroke = element.getAttribute("stroke");
  if (stroke) {
    if (stroke === "none") {
      style.stroke = false;
    } else {
      style.stroke = true;
      style.strokeStyle = stroke;
    }
  }

  const strokeOpacity = element.getAttribute("stroke-opacity");
  if (strokeOpacity) {
    style.strokeGlobalAlpha = parseFloat(strokeOpacity);
  }

  const strokeWidth = element.getAttribute("stroke-width");
  if (strokeWidth) {
    style.lineWidth = parseFloat(strokeWidth);
  }

  const strokeLinecap = element.getAttribute("stroke-linecap");
  if (strokeLinecap) {
    style.lineCap = strokeLinecap as any;
  }

  const strokeLinejoin = element.getAttribute("stroke-linejoin");
  if (strokeLinejoin) {
    style.lineJoin = strokeLinejoin as any;
  }

  const strokeDasharray = element.getAttribute("stroke-dasharray");
  if (strokeDasharray && strokeDasharray !== "none") {
    style.lineDash = strokeDasharray.split(",").map((v) => parseFloat(v.trim()));
  }

  return style;
}

export function parseSegmentRawPathsAsSimplePaths(pathSegments: PathSegmentRaw[]): SimplePath {
  const simplePath: Required<SimplePath> = { path: [], curves: [] };

  let firstP = { x: 0, y: 0 };
  for (const segment of pathSegments) {
    const [command, ...args] = segment;
    const lowerCommand = command.toLocaleLowerCase();
    const lower = command === lowerCommand;

    if (simplePath.path.length === 0) {
      const p = { x: args[0] as number, y: args[1] as number };
      simplePath.path.push(p);
      firstP = p;
      continue;
    }

    const prevP = simplePath.path.at(-1) ?? firstP;

    if (["m", "l"].includes(lowerCommand)) {
      const p = { x: args[0] as number, y: args[1] as number };
      simplePath.path.push(lower ? add(p, prevP) : p);
      simplePath.curves.push(undefined);
    } else if (["h"].includes(lowerCommand)) {
      const v = args[0] as number;
      simplePath.path.push({ x: lower ? v + prevP.x : v, y: prevP.y });
      simplePath.curves.push(undefined);
    } else if (["v"].includes(lowerCommand)) {
      const v = args[0] as number;
      simplePath.path.push({ x: prevP.x, y: lower ? v + prevP.y : v });
      simplePath.curves.push(undefined);
    } else if (["c"].includes(lowerCommand)) {
      const p = { x: args[4] as number, y: args[5] as number };
      simplePath.path.push(lower ? add(p, prevP) : p);
      const c = {
        c1: { x: args[0] as number, y: args[1] as number },
        c2: { x: args[2] as number, y: args[3] as number },
      };
      simplePath.curves.push(lower ? shiftBezierCurveControl(c, prevP) : c);
    } else if (["s"].includes(lowerCommand)) {
      const prevC = simplePath.curves.at(-1);
      const p = { x: args[2] as number, y: args[3] as number };
      const qc2 = { x: args[0] as number, y: args[1] as number };
      simplePath.path.push(lower ? add(p, prevP) : p);
      simplePath.curves.push(
        prevC ? { c1: getSymmetry(prevC.c2, prevP), c2: lower ? add(qc2, prevP) : qc2 } : undefined,
      );
    } else if (["q"].includes(lowerCommand)) {
      const p = { x: args[2] as number, y: args[3] as number };
      const qc1 = { x: args[0] as number, y: args[1] as number };
      const ap = lower ? add(p, prevP) : p;
      const aqc1 = lower ? add(qc1, prevP) : qc1;
      simplePath.path.push(ap);
      simplePath.curves.push({
        c1: add(prevP, multi(sub(aqc1, prevP), 2 / 3)),
        c2: add(ap, multi(sub(aqc1, ap), 2 / 3)),
      });
    } else if (["t"].includes(lowerCommand)) {
      const p = { x: args[0] as number, y: args[1] as number };
      const ap = lower ? add(p, prevP) : p;
      simplePath.path.push(ap);

      const prevC = simplePath.curves.at(-1);
      if (!prevC) {
        simplePath.curves.push(undefined);
        continue;
      }

      const qc1 = getSymmetry(prevC.c2, prevP);
      const ac = add(multi(sub(qc1, prevP), 3 / 2), prevP);
      simplePath.curves.push({ c1: qc1, c2: add(ap, multi(sub(ac, ap), 2 / 3)) });
    } else if (["a"].includes(lowerCommand)) {
      const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = args as [
        number,
        number,
        number,
        boolean,
        boolean,
        number,
        number,
      ];
      const endP = lower ? add({ x, y }, prevP) : { x, y };
      const curves = arcToCubicCurves(prevP, endP, rx, ry, xAxisRotation, largeArcFlag, sweepFlag);

      curves.forEach((curve) => {
        simplePath.path.push(curve.p);
        simplePath.curves.push(curve.c);
      });
    } else if (["z"].includes(lowerCommand)) {
      simplePath.path.push(firstP);
      break;
    }
  }

  if (simplePath.curves.every((c) => c === undefined)) {
    return { path: simplePath.path };
  }
  return simplePath;
}
