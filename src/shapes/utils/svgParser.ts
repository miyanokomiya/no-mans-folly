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
} from "okageo";
import { Shape, Color, CommonStyle, StrokeStyle, FillStyle } from "../../models";
import { createFillStyle } from "../../utils/fillStyle";
import { createStrokeStyle } from "../../utils/strokeStyle";
import { generateUuid } from "../../utils/random";
import { LinePolygonShape } from "../polygons/linePolygon";
import { SimplePath } from "../simplePolygon";
import { shiftBezierCurveControl } from "../../utils/path";
import { getCurveSplineBounds } from "../../utils/geometry";
import { hexToColor, parseRGBA } from "../../utils/color";

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
    return parseSvgElement(svgElement);
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
  let fill: FillStyle;
  let stroke: StrokeStyle;

  // Apply fill style
  if (style.fill) {
    fill = {
      disabled: !style.fill,
      color: convertSvgColorToShapeColor(style.fillStyle, style.fillGlobalAlpha),
    };
  } else {
    fill = createFillStyle();
  }

  // Apply stroke style
  if (style.stroke) {
    stroke = {
      disabled: !style.stroke,
      color: convertSvgColorToShapeColor(style.strokeStyle, style.strokeGlobalAlpha),
      width: style.lineWidth,
      dash: convertSvgLineDashToShapeDash(style.lineDash),
      lineCap: style.lineCap as CanvasLineCap,
      lineJoin: style.lineJoin as CanvasLineJoin,
    };
  } else {
    stroke = createStrokeStyle();
  }

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

/**
 * Apply an affine transform to a shape
 * TODO: Should proc "resize" method of the shape's struct
 * @param shape Shape data object
 * @param affine Affine matrix
 */
export function applyTransformToShape(shape: Shape, affine: AffineMatrix): void {
  // Extract translation, rotation, and scale from the affine matrix
  const translation = { x: affine[4], y: affine[5] };
  const rotation = Math.atan2(affine[1], affine[0]);

  // Apply translation to position
  shape.p = {
    x: shape.p.x + translation.x,
    y: shape.p.y + translation.y,
  };

  // Apply rotation (combine with existing rotation)
  shape.rotation = (shape.rotation || 0) + rotation;

  // Handle scaling for specific shape types
  if ("width" in shape && "height" in shape) {
    // Calculate scale factors from the affine matrix
    const scaleX = Math.sqrt(affine[0] * affine[0] + affine[1] * affine[1]);
    const scaleY = Math.sqrt(affine[2] * affine[2] + affine[3] * affine[3]);

    // Apply scaling
    (shape as any).width *= scaleX;
    (shape as any).height *= scaleY;
  }
}

/**
 * Parse SVG element and convert to shape data
 * @param element SVG element
 * @param parentId Parent shape ID
 * @returns Array of shape data objects
 */
export function parseSvgElement(element: SVGElement, parentId?: string): Shape[] {
  if (element.tagName.toLowerCase() === "svg") {
    // Process SVG root element
    const shapes: Shape[] = [];
    Array.from(element.children).forEach((child) => {
      const childShapes = parseSvgElement(child as SVGElement, parentId);
      shapes.push(...childShapes);
    });
    return shapes;
  } else if (element.tagName.toLowerCase() === "g") {
    // Process group element
    return handleGroupElement(element as SVGGElement, parentId);
  } else {
    // Process regular shape element
    const shape = convertElementToShape(element, parentId);
    return shape ? [shape] : [];
  }
}

/**
 * Handle SVG group element
 * @param groupElement SVG group element
 * @param parentId Parent shape ID
 * @returns Array of shape data objects
 */
function handleGroupElement(groupElement: SVGGElement, parentId?: string): Shape[] {
  // Parse all child elements first
  const childShapes: Shape[] = [];
  Array.from(groupElement.children).forEach((child) => {
    const shapes = parseSvgElement(child as SVGElement);
    childShapes.push(...shapes);
  });

  // If there's only one child shape, dissolve the group
  if (childShapes.length === 1) {
    const singleChild = childShapes[0];

    // Apply group transform to the child if present
    const transform = groupElement.getAttribute("transform");
    if (transform) {
      const affine = parseTransform(transform);
      // Apply the transform to the child shape
      // TODO: Have to regard multiple nests of transform
      applyTransformToShape(singleChild, affine);
    }

    // TODO: Have to apply styles to children

    // Set parent ID
    singleChild.parentId = parentId;

    // Return just the child shape with the group's attributes applied
    return [singleChild];
  }

  // Otherwise, create a group with multiple children
  const groupShape: Shape = {
    id: generateId(),
    findex: "",
    type: "group",
    p: { x: 0, y: 0 },
    rotation: 0,
    parentId,
  };

  // Apply group transform if present
  const transform = groupElement.getAttribute("transform");
  if (transform) {
    const affine = parseTransform(transform);
    // Extract rotation for the group
    groupShape.rotation = Math.atan2(affine[1], affine[0]);
  }

  // Set parent ID for all child shapes
  childShapes.forEach((shape) => {
    shape.parentId = groupShape.id;
  });

  // Return the group shape followed by all its children
  return [groupShape, ...childShapes];
}

/**
 * Convert SVG element to shape data
 * @param element SVG element
 * @param parentId Parent shape ID
 * @returns Shape data object or null if conversion fails
 */
function convertElementToShape(element: SVGElement, parentId?: string): Shape | null {
  let shape: Shape | null = null;

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
    shape.parentId = parentId;

    // Apply transform if present
    const transform = element.getAttribute("transform");
    if (transform) {
      const affine = parseTransform(transform);
      applyTransformToShape(shape, affine);
    }
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
    ...getCommonStyle(parseSvgElementStyle(element)),
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
    ...getCommonStyle(parseSvgElementStyle(element)),
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
    ...getCommonStyle(parseSvgElementStyle(element)),
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
    ...getCommonStyle(parseSvgElementStyle(element)),
  };

  return shape;
}

/**
 * Convert SVG path element to shape data
 * @param element SVG path element
 * @returns Shape data object or null if conversion fails
 */
function convertPathElement(element: SVGPathElement): Shape | null {
  const dAttr = element.getAttribute("d");
  if (!dAttr) return null;

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

  const shape: LinePolygonShape = {
    id: generateId(),
    findex: "",
    type: "line_polygon",
    p,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    polygonType: pathSegments.at(-1)?.[0].toLocaleLowerCase() === "z" ? undefined : 1,
    path: normalizedPath,
    ...getCommonStyle(parseSvgElementStyle(element)),
  };

  return shape;
}

/**
 * Parse SVG element style
 * @param element SVG element
 * @returns SVG style information
 */
function parseSvgElementStyle(element: SVGElement): ISvgStyle {
  const style: ISvgStyle = {
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
  };

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

    // TODO: Regard remained commands: "a"
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
