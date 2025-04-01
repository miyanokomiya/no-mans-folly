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
import { LinePolygonShape } from "../polygons/linePolygon";
import { SimplePath } from "../simplePolygon";
import { shiftBezierCurveControl } from "../../utils/path";
import { getCurveSplineBounds } from "../../utils/geometry";
import { arcToCubicCurves } from "../../utils/arc";
import { getCommonStruct, resizeShape } from "..";
import { RoundedRectangleShape } from "../polygons/roundedRectangle";
import { TextShape } from "../text";
import { blobToText } from "../../utils/fileAccess";
import { EllipseShape } from "../ellipse";
import { LineShape } from "../line";

type ElementContext = {
  transform?: AffineMatrix;
  style: ISvgStyle;
  parentId?: string;
};

export type ParserContext = {
  generateId: () => string;
  getRenderingColor: (str: string) => Color | undefined;
  setTextContent: (id: string, val: string) => void;
};

/**
 * Parse SVG file and convert to shape data
 * @param file SVG file
 * @returns Promise that resolves with an array of shape data objects
 */
export async function parseSvgFile(
  file: File | Blob,
  parserContextPartial: Pick<ParserContext, "generateId" | "getRenderingColor">,
): Promise<[Shape[], Map<string, string>]> {
  try {
    const text = await blobToText(file);
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(text, "image/svg+xml");
    const svgElement = svgDoc.documentElement as unknown as SVGElement;
    const textContentMap = new Map<string, string>();
    return [
      parseSvgElement(
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
            stroke: false,
            strokeGlobalAlpha: 1,
            strokeStyle: "rgb(0, 0, 0)",
          },
        }),
        {
          ...parserContextPartial,
          setTextContent: (id: string, val: string) => {
            textContentMap.set(id, val);
          },
        },
      ),
      textContentMap,
    ];
  } catch (err) {
    console.error("SVG import error:", err);
    throw err;
  }
}

function getCommonStyle(style: ISvgStyle, getRenderingColor: ParserContext["getRenderingColor"]): CommonStyle {
  const fill = createFillStyle({
    disabled: !style.fill,
    color: convertSvgColorToShapeColor(style.fillStyle, style.fillGlobalAlpha, getRenderingColor),
  });

  const stroke = createStrokeStyle({
    disabled: !style.stroke,
    color: convertSvgColorToShapeColor(style.strokeStyle, style.strokeGlobalAlpha, getRenderingColor),
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
function convertSvgColorToShapeColor(
  colorStr: string,
  alpha: number,
  getRenderingColor: ParserContext["getRenderingColor"],
): Color {
  // Defaults to black
  if (!colorStr) return { r: 0, g: 0, b: 0, a: alpha };

  const color = getRenderingColor(colorStr);
  if (!color) return { r: 0, g: 0, b: 0, a: alpha };

  return { ...color, a: alpha };
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
export function parseSvgElement(element: SVGElement, context: ElementContext, parserContext: ParserContext): Shape[] {
  if (element.tagName.toLowerCase() === "svg") {
    // Process SVG root element
    const shapes: Shape[] = [];
    Array.from(element.children).forEach((child) => {
      const childShapes = parseSvgElement(child as SVGElement, context, parserContext);
      shapes.push(...childShapes);
    });
    return shapes;
  } else if (element.tagName.toLowerCase() === "g") {
    // Process group element
    return handleGroupElement(element as SVGGElement, context, parserContext);
  } else {
    // Process regular shape element
    return convertElementToShape(element, context, parserContext);
  }
}

/**
 * Handle SVG group element
 * @param groupElement SVG group element
 * @param context Element context
 * @returns Array of shape data objects. The first element is the target shape, followed by its children.
 */
function handleGroupElement(groupElement: SVGGElement, context: ElementContext, parserContext: ParserContext): Shape[] {
  const groupId = parserContext.generateId();
  const groupContext = getElementContext(groupElement, groupId, context);

  // Parse all child elements first
  const childShapes: Shape[] = [];
  let directChildCount = 0;
  Array.from(groupElement.children).forEach((child) => {
    const shapes = parseSvgElement(child as SVGElement, groupContext, parserContext);
    if (shapes.length > 0) directChildCount++;
    childShapes.push(...shapes);
  });
  if (directChildCount === 0) return [];

  // If there's only one direct child shape, dissolve the group
  if (directChildCount === 1) {
    childShapes[0].parentId = context.parentId;
    return childShapes;
  }

  // Otherwise, create a group with multiple children
  let groupShape: Shape = {
    id: groupId,
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
 * @returns Array of shape data objects
 */
function convertElementToShape(element: SVGElement, context: ElementContext, parserContext: ParserContext): Shape[] {
  let shapes: Shape[] = [];

  switch (element.tagName.toLowerCase()) {
    case "rect":
      shapes = [convertRectElement(element, parserContext)];
      break;
    case "circle":
      shapes = [convertCircleElement(element, parserContext)];
      break;
    case "ellipse":
      shapes = [convertEllipseElement(element, parserContext)];
      break;
    case "line":
      shapes = [convertLineElement(element, parserContext)];
      break;
    case "path": {
      shapes = convertPathElement(element, parserContext);
      break;
    }
    case "text": {
      const [textShape, textContent] = convertTextElement(element, parserContext);
      parserContext.setTextContent(textShape.id, textContent);
      shapes = [textShape];
      break;
    }
  }

  if (shapes.length > 0) {
    const shapeContext = getElementContext(element, undefined, context);
    const style = getCommonStyle(shapeContext.style, parserContext.getRenderingColor);
    const transform = shapeContext.transform;
    const patch = transform ? shapes.map((shape) => resizeShape(getCommonStruct, shape, transform)) : shapes;

    shapes = shapes.map((shape, index) => ({
      ...shape,
      ...style,
      ...(patch[index] || {}),
      parentId: context.parentId,
    }));
  }

  return shapes;
}

/**
 * Convert SVG rect element to shape data
 * @param element SVG rect element
 * @returns Shape data object
 */
function convertRectElement(element: SVGElement, parserContext: ParserContext): Shape {
  const x = parseFloat(element.getAttribute("x") || "0");
  const y = parseFloat(element.getAttribute("y") || "0");
  const width = parseFloat(element.getAttribute("width") || "0");
  const height = parseFloat(element.getAttribute("height") || "0");
  const rx = parseFloat(element.getAttribute("rx") || "0");
  const ry = parseFloat(element.getAttribute("ry") || `${rx}`);

  return {
    id: parserContext.generateId(),
    findex: "",
    type: "rounded_rectangle",
    p: { x, y },
    rotation: 0,
    width,
    height,
    rx: rx ?? 0,
    ry: ry ?? 0,
  } as Omit<RoundedRectangleShape, "fill" | "stroke">;
}

/**
 * Convert SVG circle element to shape data
 * @param element SVG circle element
 * @returns Shape data object
 */
function convertCircleElement(element: SVGElement, parserContext: ParserContext): Shape {
  const cx = parseFloat(element.getAttribute("cx") || "0");
  const cy = parseFloat(element.getAttribute("cy") || "0");
  const r = parseFloat(element.getAttribute("r") || "0");
  return {
    id: parserContext.generateId(),
    findex: "",
    type: "ellipse",
    p: { x: cx - r, y: cy - r },
    rotation: 0,
    rx: r,
    ry: r,
  } as Omit<EllipseShape, "fill" | "stroke">;
}

/**
 * Convert SVG ellipse element to shape data
 * @param element SVG ellipse element
 * @returns Shape data object
 */
function convertEllipseElement(element: SVGElement, parserContext: ParserContext): Shape {
  const cx = parseFloat(element.getAttribute("cx") || "0");
  const cy = parseFloat(element.getAttribute("cy") || "0");
  const rx = parseFloat(element.getAttribute("rx") || "0");
  const ry = parseFloat(element.getAttribute("ry") || "0");

  return {
    id: parserContext.generateId(),
    findex: "",
    type: "ellipse",
    p: { x: cx - rx, y: cy - ry },
    rotation: 0,
    rx,
    ry,
  } as Omit<EllipseShape, "fill" | "stroke">;
}

/**
 * Convert SVG line element to shape data
 * @param element SVG line element
 * @returns Shape data object
 */
function convertLineElement(element: SVGElement, parserContext: ParserContext): Shape {
  const x1 = parseFloat(element.getAttribute("x1") || "0");
  const y1 = parseFloat(element.getAttribute("y1") || "0");
  const x2 = parseFloat(element.getAttribute("x2") || "0");
  const y2 = parseFloat(element.getAttribute("y2") || "0");

  return {
    id: parserContext.generateId(),
    findex: "",
    type: "line",
    p: { x: x1, y: y1 },
    q: { x: x2, y: y2 },
    rotation: 0,
  } as Omit<LineShape, "fill" | "stroke">;
}

/**
 * Convert SVG path element to shape data
 * @param element SVG path element
 * @returns Shape data object or null if conversion fails
 */
function convertPathElement(element: SVGElement, parserContext: ParserContext): Shape[] {
  const dAttr = element.getAttribute("d");
  if (!dAttr) return [];

  const pathSegments = parsePathSegmentRaws(dAttr);
  const subPaths: PathSegmentRaw[][] = [];
  let currentSubPath: PathSegmentRaw[] = [];

  for (const segment of pathSegments) {
    if (segment[0].toLocaleLowerCase() === "m" && currentSubPath.length > 0) {
      subPaths.push(currentSubPath);
      currentSubPath = [];
    }
    currentSubPath.push(segment);
  }
  if (currentSubPath.length > 0) {
    subPaths.push(currentSubPath);
  }

  return subPaths.map((rawPath) => {
    const path = parseSegmentRawPathsAsSimplePaths(rawPath);
    const bounds = getCurveSplineBounds(path.path, path.curves);
    const p = { x: bounds.x, y: bounds.y };
    const d = multi(p, -1);
    // Normalize the path based on the bounds.
    const normalizedPath = {
      path: path.path.map((v) => add(v, d)),
      curves: path.curves?.map((c) => (c ? shiftBezierCurveControl(c, d) : undefined)),
    };
    return {
      id: parserContext.generateId(),
      findex: "",
      type: "line_polygon",
      p,
      width: bounds.width,
      height: bounds.height,
      rotation: 0,
      polygonType: rawPath.at(-1)?.[0].toLocaleLowerCase() === "z" ? undefined : 1,
      path: normalizedPath,
    } as Omit<LinePolygonShape, "fill" | "stroke">;
  });
}

/**
 * Parse SVG element style
 * @param element SVG element
 * @returns SVG style information
 */
function parseSvgElementStyle(element: SVGElement, parentStyle: ISvgStyle): ISvgStyle {
  const style: ISvgStyle = { ...parentStyle };

  if (element.tagName.toLowerCase() === "text") {
    return { ...style, fill: false, stroke: false };
  }

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

function convertTextElement(element: SVGElement, parserContext: ParserContext): [Shape, string] {
  const x = parseFloat(element.getAttribute("x") || "0");
  const y = parseFloat(element.getAttribute("y") || "0");

  const textContent = element.textContent?.trim() || "";
  const shape: Omit<TextShape, "fill" | "stroke"> = {
    id: parserContext.generateId(),
    findex: "",
    type: "text",
    p: { x, y },
    rotation: 0,
    // Calculating accurate size from the element is impossible.
    width: 100,
    height: 100,
    maxWidth: 600,
    vAlign: "top",
    hAlign: "left",
  };

  return [shape, textContent];
}
