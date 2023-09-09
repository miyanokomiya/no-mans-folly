import { IRectangle, IVec2 } from "okageo";

interface PointHitTest {
  test: (target: IVec2) => boolean;
}

interface RectHitTest {
  test: (target: IRectangle) => boolean;
}

export function newCircleHitTest(c: IVec2, r: number): PointHitTest {
  const rr = r * r;

  function measure(p: IVec2): number {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return dx * dx + dy * dy;
  }

  function test(p: IVec2): boolean {
    return measure(p) <= rr;
  }

  return { test };
}

export function newRectInRectHitTest(range: IRectangle): RectHitTest {
  const r = range.x + range.width;
  const b = range.y + range.height;

  function test(target: IRectangle): boolean {
    return range.x <= target.x && range.y <= target.y && target.x + target.width <= r && target.y + target.height <= b;
  }

  return { test };
}

export function newRectHitRectHitTest(range: IRectangle): RectHitTest {
  const r = range.x + range.width;
  const b = range.y + range.height;

  function test(target: IRectangle): boolean {
    return !(r < target.x || b < target.y || target.x + target.width < range.x || target.y + target.height < range.y);
  }

  return { test };
}
