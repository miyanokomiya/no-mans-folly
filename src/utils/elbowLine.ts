import { IRectangle, IVec2, getRadian, getRectCenter } from "okageo";
import { TAU, expandRect, getRotateFn, getWrapperRect, snapAngle } from "./geometry";

const ROUND_MARGIN = 10;

type EdgeDirection = 2 | 4 | 6 | 8; // Numpad notation

export function getOptimalElbowBody(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin = ROUND_MARGIN,
): IVec2[] {
  const pd = getConnectionDirection(p, pBounds);
  const qd = getConnectionDirection(q, qBounds);

  if (pd === 2 && qd === 8) {
    return getOptimalElbowBody_2_8(p, q, pBounds, qBounds, margin);
  }
  if (pd === 8 && qd === 2) {
    return getOptimalElbowBody_2_8(q, p, qBounds, pBounds, margin).reverse();
  }

  if (pd === 2 && qd === 4) {
    return getOptimalElbowBody_2_4(p, q, pBounds, qBounds, margin);
  }
  if (pd === 4 && qd === 2) {
    return getOptimalElbowBody_2_4(q, p, qBounds, pBounds, margin).reverse();
  }

  if (pd === 2 && qd === 6) {
    return getOptimalElbowBody_2_6(p, q, pBounds, qBounds, margin);
  }
  if (pd === 6 && qd === 2) {
    return getOptimalElbowBody_2_6(q, p, qBounds, pBounds, margin).reverse();
  }

  if (pd === 6 && qd === 4) {
    return getOptimalElbowBody_6_4(p, q, pBounds, qBounds, margin);
  }
  if (pd === 4 && qd === 6) {
    return getOptimalElbowBody_6_4(q, p, qBounds, pBounds, margin).reverse();
  }

  if (pd === 8 && qd === 6) {
    return getOptimalElbowBody_8_6(p, q, pBounds, qBounds, margin);
  }
  if (pd === 6 && qd === 8) {
    return getOptimalElbowBody_8_6(q, p, qBounds, pBounds, margin).reverse();
  }

  if (pd === 4 && qd === 8) {
    return getOptimalElbowBody_4_8(p, q, pBounds, qBounds, margin);
  }
  if (pd === 8 && qd === 4) {
    return getOptimalElbowBody_4_8(q, p, qBounds, pBounds, margin).reverse();
  }

  if (pd === 2 && qd === 2) {
    return getOptimalElbowBody_2_2(p, q, pBounds, qBounds, margin);
  }

  if (pd === 8 && qd === 8) {
    return getOptimalElbowBody_8_8(p, q, pBounds, qBounds, margin);
  }

  if (pd === 4 && qd === 4) {
    return getOptimalElbowBody_4_4(p, q, pBounds, qBounds, margin);
  }

  if (pd === 6 && qd === 6) {
    return getOptimalElbowBody_6_6(p, q, pBounds, qBounds, margin);
  }

  return [];
}

export function getConnectionDirection(p: IVec2, bounds: IRectangle): EdgeDirection {
  const boundsCenter = getRectCenter(bounds);
  const radian = getRadian({
    x: (p.x - boundsCenter.x) / Math.max(bounds.width, 1),
    y: (p.y - boundsCenter.y) / Math.max(bounds.height, 1),
  });
  const adjusted = radian < 0 ? radian + TAU : radian;
  const index = snapAngle((adjusted * 180) / Math.PI, 90) / 90;
  switch (index) {
    case 1:
      return 2;
    case 2:
      return 4;
    case 3:
      return 8;
    default:
      return 6;
  }
}

function getOptimalElbowBody_2_8(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const [, pr, pb, pl] = [pBounds.y, pBounds.x + pBounds.width, pBounds.y + pBounds.height, pBounds.x];
  const [qt, qr, , ql] = [qBounds.y, qBounds.x + qBounds.width, qBounds.y + qBounds.height, qBounds.x];

  if (pb < qt) {
    if (p.x === q.x) return [];

    const y = (qt + pb) / 2;
    return [
      { x: p.x, y },
      { x: q.x, y },
    ];
  } else {
    if (pr < ql) {
      const x = (ql + pr) / 2;
      return [
        { x: p.x, y: pb + margin },
        { x, y: pb + margin },
        { x, y: qt - margin },
        { x: q.x, y: qt - margin },
      ];
    } else if (qr < pl) {
      const x = (pl + qr) / 2;
      return [
        { x: p.x, y: pb + margin },
        { x, y: pb + margin },
        { x, y: qt - margin },
        { x: q.x, y: qt - margin },
      ];
    } else {
      const whole = expandRect(getWrapperRect([pBounds, qBounds]), margin);
      const x = p.x - whole.x < whole.x + whole.width - p.x ? whole.x : whole.x + whole.width;
      return [
        { x: p.x, y: whole.y + whole.height },
        { x, y: whole.y + whole.height },
        { x, y: whole.y },
        { x: q.x, y: whole.y },
      ];
    }
  }
}

function getOptimalElbowBody_2_4(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const [, pr, pb] = [pBounds.y, pBounds.x + pBounds.width, pBounds.y + pBounds.height, pBounds.x];
  const [qt, , , ql] = [qBounds.y, qBounds.x + qBounds.width, qBounds.y + qBounds.height, qBounds.x];

  if (p.y < q.y) {
    if (p.x < ql - margin) {
      return [{ x: p.x, y: q.y }];
    }

    if (p.y < qt) {
      if (p.x < ql - margin) {
        return [{ x: p.x, y: q.y }];
      } else {
        return [
          { x: p.x, y: (pb + qt) / 2 },
          { x: ql - margin, y: (pb + qt) / 2 },
          { x: ql - margin, y: q.y },
        ];
      }
    } else {
      const whole = expandRect(getWrapperRect([pBounds, qBounds]), margin);
      return [
        { x: p.x, y: whole.y + whole.height },
        { x: whole.x, y: whole.y + whole.height },
        { x: whole.x, y: q.y },
      ];
    }
  } else {
    if (pr < ql - margin) {
      return [
        { x: p.x, y: pb + margin },
        { x: (pr + ql) / 2, y: pb + margin },
        { x: (pr + ql) / 2, y: q.y },
      ];
    } else {
      const whole = expandRect(getWrapperRect([pBounds, qBounds]), margin);
      return [
        { x: p.x, y: whole.y + whole.height },
        { x: whole.x, y: whole.y + whole.height },
        { x: whole.x, y: q.y },
      ];
    }
  }
}

function getOptimalElbowBody_2_6(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const [, , pb, pl] = [pBounds.y, pBounds.x + pBounds.width, pBounds.y + pBounds.height, pBounds.x];
  const [qt, qr] = [qBounds.y, qBounds.x + qBounds.width, qBounds.y + qBounds.height, qBounds.x];

  if (p.y < q.y) {
    if (qr < p.x - margin) {
      return [{ x: p.x, y: q.y }];
    }

    if (p.y < qt) {
      if (qr < p.x - margin) {
        return [{ x: p.x, y: q.y }];
      } else {
        return [
          { x: p.x, y: (pb + qt) / 2 },
          { x: qr + margin, y: (pb + qt) / 2 },
          { x: qr + margin, y: q.y },
        ];
      }
    } else {
      const whole = expandRect(getWrapperRect([pBounds, qBounds]), margin);
      return [
        { x: p.x, y: whole.y + whole.height },
        { x: whole.x + whole.width, y: whole.y + whole.height },
        { x: whole.x + whole.width, y: q.y },
      ];
    }
  } else {
    if (qr < pl - margin) {
      return [
        { x: p.x, y: pb + margin },
        { x: (qr + pl) / 2, y: pb + margin },
        { x: (qr + pl) / 2, y: q.y },
      ];
    } else {
      const whole = expandRect(getWrapperRect([pBounds, qBounds]), margin);
      return [
        { x: p.x, y: whole.y + whole.height },
        { x: whole.x + whole.width, y: whole.y + whole.height },
        { x: whole.x + whole.width, y: q.y },
      ];
    }
  }
}

function getOptimalElbowBody_6_4(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const rotateFn = getRotateFn(Math.PI / 2);
  const rp = rotateFn(p);
  const rq = rotateFn(q);
  const a = rotateFn(pBounds);
  const rpb = { x: a.x - pBounds.height, y: a.y, width: pBounds.height, height: pBounds.width };
  const b = rotateFn(qBounds);
  const rqb = { x: b.x - qBounds.height, y: b.y, width: qBounds.height, height: qBounds.width };
  return getOptimalElbowBody_2_8(rp, rq, rpb, rqb, margin).map((v) => rotateFn(v, true));
}

function getOptimalElbowBody_8_6(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const rotateFn = getRotateFn(Math.PI);
  const rp = rotateFn(p);
  const rq = rotateFn(q);
  const a = rotateFn(pBounds);
  const rpb = { x: a.x - pBounds.width, y: a.y - pBounds.height, width: pBounds.width, height: pBounds.height };
  const b = rotateFn(qBounds);
  const rqb = { x: b.x - qBounds.width, y: b.y - qBounds.height, width: qBounds.width, height: qBounds.height };
  return getOptimalElbowBody_2_4(rp, rq, rpb, rqb, margin).map((v) => rotateFn(v, true));
}

function getOptimalElbowBody_4_8(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const rotateFn = getRotateFn(-Math.PI / 2);
  const rp = rotateFn(p);
  const rq = rotateFn(q);
  const a = rotateFn(pBounds);
  const rpb = { x: a.x, y: a.y - pBounds.width, width: pBounds.height, height: pBounds.width };
  const b = rotateFn(qBounds);
  const rqb = { x: b.x, y: b.y - qBounds.width, width: qBounds.height, height: qBounds.width };
  return getOptimalElbowBody_2_4(rp, rq, rpb, rqb, margin).map((v) => rotateFn(v, true));
}

function getOptimalElbowBody_2_2(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const [pt, pr, pb, pl] = [pBounds.y, pBounds.x + pBounds.width, pBounds.y + pBounds.height, pBounds.x];
  const [qt, qr, qb, ql] = [qBounds.y, qBounds.x + qBounds.width, qBounds.y + qBounds.height, qBounds.x];
  const whole = expandRect(getWrapperRect([pBounds, qBounds]), margin);

  if (pb < qt) {
    if (p.x < ql - margin || qr < p.x - margin) {
      return [
        { x: p.x, y: whole.y + whole.height },
        { x: q.x, y: whole.y + whole.height },
      ];
    } else {
      const x = p.x - ql < qr - p.x ? ql - margin : qr + margin;
      return [
        { x: p.x, y: (pb + qt) / 2 },
        { x, y: (pb + qt) / 2 },
        { x, y: qb + margin },
        { x: q.x, y: qb + margin },
      ];
    }
  } else if (qb < pt) {
    if (q.x < pl - margin || pr < q.x - margin) {
      return [
        { x: p.x, y: whole.y + whole.height },
        { x: q.x, y: whole.y + whole.height },
      ];
    } else {
      const x = p.x - pl < pr - p.x ? pl - margin : pr + margin;
      return [
        { x: p.x, y: pb + margin },
        { x, y: pb + margin },
        { x, y: (qb + pt) / 2 },
        { x: q.x, y: (qb + pt) / 2 },
      ];
    }
  } else {
    return [
      { x: p.x, y: whole.y + whole.height },
      { x: q.x, y: whole.y + whole.height },
    ];
  }
}

function getOptimalElbowBody_8_8(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const rotateFn = getRotateFn(Math.PI);
  const rp = rotateFn(p);
  const rq = rotateFn(q);
  const a = rotateFn(pBounds);
  const rpb = { x: a.x - pBounds.width, y: a.y - pBounds.height, width: pBounds.width, height: pBounds.height };
  const b = rotateFn(qBounds);
  const rqb = { x: b.x - qBounds.width, y: b.y - qBounds.height, width: qBounds.width, height: qBounds.height };
  return getOptimalElbowBody_2_2(rp, rq, rpb, rqb, margin).map((v) => rotateFn(v, true));
}

function getOptimalElbowBody_4_4(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const rotateFn = getRotateFn(-Math.PI / 2);
  const rp = rotateFn(p);
  const rq = rotateFn(q);
  const a = rotateFn(pBounds);
  const rpb = { x: a.x, y: a.y - pBounds.width, width: pBounds.height, height: pBounds.width };
  const b = rotateFn(qBounds);
  const rqb = { x: b.x, y: b.y - qBounds.width, width: qBounds.height, height: qBounds.width };
  return getOptimalElbowBody_2_2(rp, rq, rpb, rqb, margin).map((v) => rotateFn(v, true));
}

function getOptimalElbowBody_6_6(
  p: IVec2,
  q: IVec2,
  pBounds: IRectangle,
  qBounds: IRectangle,
  margin: number,
): IVec2[] {
  const rotateFn = getRotateFn(Math.PI / 2);
  const rp = rotateFn(p);
  const rq = rotateFn(q);
  const a = rotateFn(pBounds);
  const rpb = { x: a.x - pBounds.height, y: a.y, width: pBounds.height, height: pBounds.width };
  const b = rotateFn(qBounds);
  const rqb = { x: b.x - qBounds.height, y: b.y, width: qBounds.height, height: qBounds.width };
  return getOptimalElbowBody_2_2(rp, rq, rpb, rqb, margin).map((v) => rotateFn(v, true));
}
