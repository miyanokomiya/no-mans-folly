import { IVec2 } from "okageo";

interface ShapeHitTest {
  measure: (p: IVec2) => number;
  test: (p: IVec2) => boolean;
}

export function newCircleHitTest(c: IVec2, r: number): ShapeHitTest {
  const rr = r * r;

  function measure(p: IVec2): number {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return dx * dx + dy * dy;
  }

  function test(p: IVec2): boolean {
    return measure(p) <= rr;
  }

  return { measure, test };
}
