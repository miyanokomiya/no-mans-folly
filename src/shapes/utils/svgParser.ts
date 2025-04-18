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
  IRectangle,
  IVec2,
  multiAffines,
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
  getElementById: (id: string) => SVGElement | undefined;
  useRouteSet: Set<string>;
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
    return parseSvgElementTree(svgElement, parserContextPartial);
  } catch (err) {
    console.error("SVG import error:", err);
    throw err;
  }
}

export function parseSvgElementTree(
  svgElement: SVGElement,
  parserContextPartial: Pick<ParserContext, "generateId" | "getRenderingColor">,
): [Shape[], Map<string, string>] {
  const textContentMap = new Map<string, string>();
  const elementByIdMap = new Map<string, SVGElement>();
  function step(elm: Element) {
    const id = elm.getAttribute("id");
    if (id) {
      elementByIdMap.set(id, elm as SVGElement);
    }
    Array.from(elm.children).forEach((child) => {
      step(child);
    });
  }
  step(svgElement);

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
        getElementById: (id: string) => {
          return elementByIdMap.get(id);
        },
        useRouteSet: new Set(),
      },
    ),
    textContentMap,
  ];
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
  const tagName = getTagName(element);
  if (tagName === "svg") {
    // Process SVG root element
    return handleSvgElement(element, context, parserContext);
  } else if (tagName === "g") {
    // Process group element
    return handleGroupElement(element, context, parserContext);
  } else if (tagName === "use") {
    // Process use element
    return handleUseElement(element, context, parserContext);
  } else if (tagName === "switch") {
    // Process switch element
    return handleSwitchElement(element, context, parserContext);
  } else {
    // Process regular shape element
    return convertElementToShape(element, context, parserContext);
  }
}

function handleSwitchElement(element: SVGElement, context: ElementContext, parserContext: ParserContext): Shape[] {
  // The <switch> element is used to select one of its child elements to be rendered.
  // It is not a shape element itself, so just picking the first child as a target element.
  const firstChild = element.children[0];
  return firstChild ? parseSvgElement(firstChild as SVGElement, context, parserContext) : [];
}

function handleUseElement(element: SVGElement, context: ElementContext, parserContext: ParserContext): Shape[] {
  const href = element.getAttribute("href") || element.getAttribute("xlink:href");
  if (!href) return [];

  const targetId = href.slice(1);
  // Check if the target element is already processed to avoid infinite loop
  if (parserContext.useRouteSet.has(targetId)) return [];

  const targetElm = parserContext.getElementById(targetId);
  // If the target element is not found or the target element is a <use> element, no shapes are created
  if (!targetElm || getTagName(targetElm) === "use") return [];

  const cloned = targetElm.cloneNode(true) as SVGElement;
  // x, y, width and height of <use> element have special meaning.
  // Inherit other attributes only if they are not already set.
  // ref: https://www.w3.org/TR/SVG/struct.html#UseElement
  // transform attribute should be apply to <use> element.
  // => Avoid overwriting the transform attribute of the target element.
  for (const attr of element.attributes) {
    if (!["x", "y", "width", "height", "transform"].includes(attr.name) && !cloned.hasAttribute(attr.name)) {
      cloned.setAttribute(attr.name, attr.value);
    }
  }

  // Apply the transform attribute of the <use> element to the cloned element
  // Ignore width and height that only affect a viewport of certain elements such as <svg> and <symbol>.
  // => Since all elements are converted to shapes, viewports don't matter much.
  const affines: AffineMatrix[] = [];

  if (context.transform) {
    affines.push(context.transform);
  }

  const transformAttr = element.getAttribute("transform");
  if (transformAttr) {
    affines.push(parseTransform(transformAttr));
  }

  const xAttr = element.getAttribute("x");
  const yAttr = element.getAttribute("y");
  if (xAttr || yAttr) {
    affines.push([1, 0, 0, 1, parseFloat(xAttr ?? "0"), parseFloat(yAttr ?? "0")]);
  }

  const nextContext = { ...context, transform: multiAffines(affines) };

  parserContext.useRouteSet.add(element.id);
  const shapes = parseSvgElement(cloned, nextContext, parserContext);
  parserContext.useRouteSet.delete(element.id);

  return shapes;
}

/**
 * Handle SVG svg element
 * @param element SVG svg element
 * @param context Element context
 * @returns Array of shape data objects. The first element is the target shape, followed by its children.
 */
function handleSvgElement(element: SVGElement, context: ElementContext, parserContext: ParserContext): Shape[] {
  // x and y attributes of SVG element can affect coordinates of inner elements.
  // Ignore width and height attributes and respect original scale of inner elements.
  // => Resizing all kinds of attributes is unrealistic.
  const x = parseSvgAttributeAsFloat(element, "x") || 0;
  const y = parseSvgAttributeAsFloat(element, "y") || 0;
  // Regard viewBox likewise.
  const viewBox = parseViewBox(element.getAttribute("viewBox"));
  const dx = x - (viewBox?.x ?? 0);
  const dy = y - (viewBox?.y ?? 0);
  if (dx === 0 && dy === 0) return handleGroupElement(element, context, parserContext);

  const t: AffineMatrix = [1, 0, 0, 1, dx, dy];
  return handleGroupElement(
    element,
    {
      ...context,
      transform: context.transform ? multiAffine(context.transform, t) : t,
    },
    parserContext,
  );
}

/**
 * Handle SVG group element
 * @param element SVG group element
 * @param context Element context
 * @returns Array of shape data objects. The first element is the target shape, followed by its children.
 */
function handleGroupElement(element: SVGElement, context: ElementContext, parserContext: ParserContext): Shape[] {
  const groupId = parserContext.generateId();
  const groupContext = getElementContext(element, groupId, context);

  // Parse all child elements first
  const childShapes: Shape[] = [];
  let directChildCount = 0;
  Array.from(element.children).forEach((child) => {
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

  switch (getTagName(element)) {
    case "rect": {
      const shape = convertRectElement(element, parserContext);
      if (shape) shapes = [shape];
      break;
    }
    case "circle": {
      const shape = convertCircleElement(element, parserContext);
      if (shape) shapes = [shape];
      break;
    }
    case "ellipse": {
      const shape = convertEllipseElement(element, parserContext);
      if (shape) shapes = [shape];
      break;
    }
    case "line":
      shapes = [convertLineElement(element, parserContext)];
      break;
    case "path": {
      shapes = convertPathElement(element, parserContext);
      break;
    }
    case "polygon": {
      const shape = convertPolygonElement(element, parserContext);
      if (shape) shapes = [shape];
      break;
    }
    case "polyline": {
      const shape = convertPolygonElement(element, parserContext, true);
      if (shape) shapes = [shape];
      break;
    }
    case "text":
    case "foreignobject": {
      const result = convertTextElement(element, parserContext);
      if (result) {
        const [textShape, textContent] = result;
        parserContext.setTextContent(textShape.id, textContent);
        shapes = [textShape];
      }
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
function convertRectElement(element: SVGElement, parserContext: ParserContext): Shape | undefined {
  const x = parseSvgAttributeAsFloat(element, "x") || 0;
  const y = parseSvgAttributeAsFloat(element, "y") || 0;
  const width = parseSvgAttributeAsFloat(element, "width") || 0;
  const height = parseSvgAttributeAsFloat(element, "height") || 0;
  const rx = parseSvgAttributeAsFloat(element, "rx") || 0;
  const ry = parseSvgAttributeAsFloat(element, "ry") || rx;
  if (width === 0 || height === 0) return;

  return {
    id: parserContext.generateId(),
    findex: "",
    type: "rounded_rectangle",
    p: { x, y },
    rotation: 0,
    width,
    height,
    rx,
    ry,
  } as Omit<RoundedRectangleShape, "fill" | "stroke">;
}

/**
 * Convert SVG circle element to shape data
 * @param element SVG circle element
 * @returns Shape data object
 */
function convertCircleElement(element: SVGElement, parserContext: ParserContext): Shape | undefined {
  const cx = parseSvgAttributeAsFloat(element, "cx") || 0;
  const cy = parseSvgAttributeAsFloat(element, "cy") || 0;
  const r = parseSvgAttributeAsFloat(element, "r") || 0;
  if (r === 0) return;

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
function convertEllipseElement(element: SVGElement, parserContext: ParserContext): Shape | undefined {
  const cx = parseSvgAttributeAsFloat(element, "cx") || 0;
  const cy = parseSvgAttributeAsFloat(element, "cy") || 0;
  const rx = parseSvgAttributeAsFloat(element, "rx") || 0;
  const ry = parseSvgAttributeAsFloat(element, "ry") || 0;
  if (rx === 0 || ry === 0) return;

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
  const x1 = parseSvgAttributeAsFloat(element, "x1") || 0;
  const y1 = parseSvgAttributeAsFloat(element, "y1") || 0;
  const x2 = parseSvgAttributeAsFloat(element, "x2") || 0;
  const y2 = parseSvgAttributeAsFloat(element, "y2") || 0;

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

  return subPaths
    .filter((rawPath) => rawPath.length > 1)
    .map((rawPath) => {
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
 * Convert SVG polygon or polyline element to shape data
 * @param element SVG polygon or polyline element
 * @param polyline Whether the element is a polyline
 * @returns Shape data object
 */
function convertPolygonElement(element: SVGElement, parserContext: ParserContext, polyline = false): Shape | undefined {
  const pointsAttr = element.getAttribute("points");
  const points = pointsAttr ? parseSvgPoints(pointsAttr) : undefined;
  if (!points || points.length < 2) return;

  const bounds = getCurveSplineBounds(points, undefined);
  const p = { x: bounds.x, y: bounds.y };
  const d = multi(p, -1);

  return {
    id: parserContext.generateId(),
    findex: "",
    type: "line_polygon",
    p,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    polygonType: polyline ? 1 : undefined,
    path: { path: points.map((v) => add(v, d)) },
  } as Omit<LinePolygonShape, "fill" | "stroke">;
}

/**
 * Parse SVG element style
 * @param element SVG element
 * @returns SVG style information
 */
function parseSvgElementStyle(element: SVGElement, parentStyle: ISvgStyle): ISvgStyle {
  const style: ISvgStyle = { ...parentStyle };

  if (["text", "foreignobject"].includes(getTagName(element))) {
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

function convertTextElement(element: SVGElement, parserContext: ParserContext): [Shape, string] | undefined {
  const x = parseSvgAttributeAsFloat(element, "x") || 0;
  const y = parseSvgAttributeAsFloat(element, "y") || 0;

  const textContent = element.textContent?.trim() || "";
  if (!textContent) return;

  const shape: Omit<TextShape, "fill" | "stroke"> = {
    id: parserContext.generateId(),
    findex: "",
    type: "text",
    p: { x, y },
    rotation: 0,
    // Calculating accurate size from the element is impossible.
    width: 600,
    height: 100,
    maxWidth: 600,
    vAlign: "top",
    hAlign: "left",
  };

  return [shape, textContent];
}

/**
 * Parse the viewBox attribute of an SVG element
 * @param viewBoxStr The viewBox attribute string
 * @returns An object containing x, y, width, and height of the viewBox, or null if invalid
 */
function parseViewBox(viewBoxStr?: string | null): IRectangle | undefined {
  if (!viewBoxStr) return;

  const values = viewBoxStr.split(/\s+|,/).map(parseFloat);
  if (values.length !== 4 || values.some(isNaN)) return;

  const [x, y, width, height] = values;
  return { x, y, width, height };
}

/**
 * Parse an SVG attribute as a float value
 * @param element SVG element
 * @param attributeName Attribute name
 * @returns Parsed float value or undefined if the attribute does not exist
 */
function parseSvgAttributeAsFloat(element: SVGElement, attributeName: string): number | undefined {
  const value = element.getAttribute(attributeName);
  return value !== null ? parseFloat(value) : undefined;
}

/**
 * Parse SVG points attribute
 * @param pointsAttr Points attribute string
 * @returns Array of points or undefined if invalid
 */
function parseSvgPoints(pointsAttr: string): IVec2[] | undefined {
  if (!pointsAttr) return;

  return pointsAttr
    .trim()
    .split(/\s+|,/)
    .map(parseFloat)
    .reduce((acc, val, idx, arr) => {
      if (idx % 2 === 0) acc.push({ x: val, y: arr[idx + 1] });
      return acc;
    }, [] as IVec2[]);
}

function getTagName(element: SVGElement): string {
  return element.tagName.toLowerCase().replace(/svg:/, "");
}
