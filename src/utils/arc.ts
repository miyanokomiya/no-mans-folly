import { IVec2 } from "okageo";

interface CubicCurve {
  p: { x: number; y: number };
  c: { c1: { x: number; y: number }; c2: { x: number; y: number } };
}

/**
 * Convert an SVG arc to cubic Bézier curves
 * @param start Start point
 * @param end End point
 * @param rx X-axis radius
 * @param ry Y-axis radius
 * @param xAxisRotation Rotation of the ellipse in degrees
 * @param largeArcFlag Large arc flag (1 or 0)
 * @param sweepFlag Sweep flag (1 or 0)
 * @returns Array of cubic Bézier curves
 */
export function arcToCubicCurves(
  start: IVec2,
  end: IVec2,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
): CubicCurve[] {
  // Convert rotation to radians
  const phi = (xAxisRotation * Math.PI) / 180;

  // Precompute trigonometric values for phi
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1') in the transformed coordinate system
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Step 2: Adjust radii
  const rxSq = rx * rx;
  const rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  let radiiScale = Math.sqrt((rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq));
  if (isNaN(radiiScale) || radiiScale < 0) radiiScale = 0;
  if (largeArcFlag === sweepFlag) radiiScale = -radiiScale;

  const cxp = radiiScale * ((rx * y1p) / ry);
  const cyp = radiiScale * (-(ry * x1p) / rx);

  // Step 3: Compute (cx, cy) in the original coordinate system
  const cx = cosPhi * cxp - sinPhi * cyp + (start.x + end.x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (start.y + end.y) / 2;

  // Step 4: Compute start and end angles
  const startAngle = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  const endAngle = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);

  let deltaAngle = endAngle - startAngle;
  if (!sweepFlag && deltaAngle > 0) deltaAngle -= 2 * Math.PI;
  if (sweepFlag && deltaAngle < 0) deltaAngle += 2 * Math.PI;

  // Step 5: Approximate the arc using cubic Bézier curves
  const segments = Math.ceil(Math.abs(deltaAngle / (Math.PI / 2)));
  const curves: CubicCurve[] = [];
  const angleIncrement = deltaAngle / segments;

  for (let i = 0; i < segments; i++) {
    const theta1 = startAngle + i * angleIncrement;
    const theta2 = theta1 + angleIncrement;

    // Precompute trigonometric values
    const cosTheta1 = Math.cos(theta1);
    const sinTheta1 = Math.sin(theta1);
    const cosTheta2 = Math.cos(theta2);
    const sinTheta2 = Math.sin(theta2);

    // Compute points on the rotated ellipse
    const p1 = {
      x: cx + rx * cosTheta1 * cosPhi - ry * sinTheta1 * sinPhi,
      y: cy + rx * cosTheta1 * sinPhi + ry * sinTheta1 * cosPhi,
    };
    const p2 = {
      x: cx + rx * cosTheta2 * cosPhi - ry * sinTheta2 * sinPhi,
      y: cy + rx * cosTheta2 * sinPhi + ry * sinTheta2 * cosPhi,
    };

    // Compute control points for the Bézier curve
    const alpha = (Math.sin(angleIncrement) * (Math.sqrt(4 + 3 * Math.tan(angleIncrement / 2) ** 2) - 1)) / 3;
    const c1 = {
      x: p1.x + alpha * (-rx * sinTheta1 * cosPhi - ry * cosTheta1 * sinPhi),
      y: p1.y + alpha * (-rx * sinTheta1 * sinPhi + ry * cosTheta1 * cosPhi),
    };
    const c2 = {
      x: p2.x + alpha * (rx * sinTheta2 * cosPhi + ry * cosTheta2 * sinPhi),
      y: p2.y + alpha * (rx * sinTheta2 * sinPhi - ry * cosTheta2 * cosPhi),
    };

    curves.push({ p: p2, c: { c1, c2 } });
  }

  return curves;
}
