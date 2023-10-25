import { LineShape, isLineShape } from "../shapes/line";
import { RotatedRectPath, TAU, getLocationFromRateOnRectPath } from "../utils/geometry";
import { AppCanvasStateContext } from "./states/appCanvas/core";
import { EntityPatchInfo, Shape, StyleScheme } from "../models";
import { applyFillStyle } from "../utils/fillStyle";
import { newElbowLineHandler } from "./elbowLineHandler";
import { optimizeLinePath } from "./lineSnapping";
import { ShapeComposite, newShapeComposite } from "./shapeComposite";
import { toList } from "../utils/commons";

interface Option {
  connectedLinesMap: {
    [id: string]: LineShape[];
  };
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">;
  keepConnection?: boolean;
}

export function newConnectedLineHandler(option: Option) {
  /**
   * Returns patched properties that are updated in this function.
   * => Returned value doesn't inherit the content of "updatedMap".
   */
  function onModified(updatedMap: { [id: string]: Partial<Shape> }): {
    [id: string]: Partial<LineShape>;
  } {
    const ret: { [id: string]: Partial<LineShape> } = {};

    const shapeComposite = option.ctx.getShapeComposite();
    const shapeMap = shapeComposite.shapeMap;
    const updatedShapeMap: { [id: string]: Shape } = {};
    Object.entries(updatedMap).forEach(([id, patch]) => {
      if (shapeMap[id]) {
        updatedShapeMap[id] = { ...shapeMap[id], ...patch };
      }
    });

    // Update connections
    Object.entries(updatedShapeMap).forEach(([id, shape]) => {
      // When a line is modified but connected shapes doesn't, the connections should be deleted.
      // => This behavior shouldn't always work when the operation isn't supposed to be shape moving.
      // => Prepare "keepConnection" to disable this behavior.
      if (!option.keepConnection && isLineShape(shape)) {
        if (shape.pConnection && !updatedShapeMap[shape.pConnection.id]) {
          ret[shape.id] ??= {};
          ret[shape.id].pConnection = undefined;
        }
        if (shape.qConnection && !updatedShapeMap[shape.qConnection.id]) {
          ret[shape.id] ??= {};
          ret[shape.id].qConnection = undefined;
        }
        if (shape.body) {
          shape.body.forEach((b, i) => {
            if (b.c && !updatedShapeMap[b.c.id]) {
              ret[shape.id] ??= {};
              if (!ret[shape.id].body) {
                ret[shape.id].body = shape.body!.concat();
              }
              const next = { ...ret[shape.id].body![i] };
              delete next.c;
              ret[shape.id].body![i] = next;
            }
          });
        }
        return;
      }

      const rectPath = shapeComposite.getLocalRectPolygon(shape);
      const rotation = shape.rotation;

      const lines = option.connectedLinesMap[id] ?? [];
      lines.forEach((line) => {
        if (line.pConnection?.id === id) {
          const p = getLocationFromRateOnRectPath(rectPath, rotation, line.pConnection.rate);
          ret[line.id] ??= {};
          ret[line.id].p = p;
        }
        if (line.qConnection?.id === id) {
          const q = getLocationFromRateOnRectPath(rectPath, rotation, line.qConnection.rate);
          ret[line.id] ??= {};
          ret[line.id].q = q;
        }

        if (line.body) {
          line.body.forEach((b, i) => {
            if (b.c?.id === id) {
              const next = { ...b, p: getLocationFromRateOnRectPath(rectPath, rotation, b.c.rate) };
              ret[line.id] ??= {};
              ret[line.id].body ??= line.body!.concat();
              ret[line.id].body![i] = next;
            }
          });
        }
      });
    });

    const updatedShapeComposite = newShapeComposite({
      shapes: toList({ ...shapeMap, ...updatedShapeMap }),
      getStruct: shapeComposite.getShapeStruct,
    });
    // Optimize line connections
    Object.entries(ret).forEach(([id, patch]) => {
      const updated = { ...shapeMap[id], ...(updatedShapeMap[id] ?? {}), ...patch } as LineShape;
      const optimized = optimizeLinePath(
        {
          getShapeComposite: () => updatedShapeComposite,
        },
        updated,
      );
      if (optimized) {
        ret[id] = { ...patch, ...optimized };
      }
    });

    // Update elbow bodies
    {
      const patchedElbows = Object.entries(ret)
        .map<LineShape>(([id, patch]) => {
          const original = shapeMap[id] as LineShape;
          const updated = updatedMap[id] ?? {};
          return { ...original, ...updated, ...patch };
        })
        .filter((l) => l.lineType === "elbow");
      const nextShapeMap: { [id: string]: Shape } = {};
      const elbowConnectedIds = getElbowConnectedShapeIds(patchedElbows);
      elbowConnectedIds.forEach((id) => {
        if (shapeMap[id]) {
          nextShapeMap[id] = updatedShapeMap[id] ?? shapeMap[id];
        }
      });
      patchedElbows.forEach((line) => {
        nextShapeMap[line.id] = line;
      });

      const nextShapeComposite = newShapeComposite({
        shapes: toList(nextShapeMap),
        getStruct: shapeComposite.getShapeStruct,
      });
      const elbowHandler = newElbowLineHandler({
        getShapeComposite: () => nextShapeComposite,
      });

      patchedElbows.forEach((lineShape) => {
        const body = elbowHandler.optimizeElbow(lineShape);
        ret[lineShape.id] = { ...ret[lineShape.id], body };
      });
    }

    return ret;
  }

  return { onModified };
}
export type ConnectedLineHandler = ReturnType<typeof newConnectedLineHandler>;

export function getConnectedLineInfoMap(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">,
  connectedTargetIds: string[],
): {
  [id: string]: LineShape[];
} {
  const shapeMap = ctx.getShapeComposite().shapeMap;
  const targetIds = new Set(connectedTargetIds);
  const connectedLineInfoMap: { [id: string]: LineShape[] } = {};
  Object.values(shapeMap)
    .filter(isLineShape)
    .forEach((line) => {
      if (line.pConnection && targetIds.has(line.pConnection.id)) {
        connectedLineInfoMap[line.pConnection.id] ??= [];
        connectedLineInfoMap[line.pConnection.id].push(line);
      }
      if (line.qConnection && targetIds.has(line.qConnection.id)) {
        connectedLineInfoMap[line.qConnection.id] ??= [];
        connectedLineInfoMap[line.qConnection.id].push(line);
      }

      line.body?.some((b) => {
        if (b.c && targetIds.has(b.c.id)) {
          connectedLineInfoMap[b.c.id] ??= [];
          connectedLineInfoMap[b.c.id].push(line);
          return true;
        }
      });
    });

  return connectedLineInfoMap;
}

export function getRotatedRectPathMap(
  ctx: Pick<AppCanvasStateContext, "getShapeComposite">,
  updatedMap: { [id: string]: Partial<Shape> },
): {
  [id: string]: RotatedRectPath;
} {
  const shapeComposite = ctx.getShapeComposite();
  const shapeMap = shapeComposite.shapeMap;
  const modifiedMap: { [id: string]: RotatedRectPath } = {};
  Object.entries(updatedMap).forEach(([id, shape]) => {
    const s = shapeMap[id];
    if (s) {
      const merged = { ...s, ...shape };
      modifiedMap[id] = [shapeComposite.getLocalRectPolygon(merged), merged.rotation];
    }
  });
  return modifiedMap;
}

export function renderPatchedVertices(
  ctx: CanvasRenderingContext2D,
  option: { lines: Partial<LineShape>[]; scale: number; style: StyleScheme },
) {
  applyFillStyle(ctx, { color: option.style.selectionSecondaly });
  const size = 5 * option.scale;

  option.lines.forEach((l) => {
    if (l.p) {
      ctx.beginPath();
      ctx.arc(l.p.x, l.p.y, size, 0, TAU);
      ctx.fill();
    }
    if (l.q) {
      ctx.beginPath();
      ctx.arc(l.q.x, l.q.y, size, 0, TAU);
      ctx.fill();
    }
    if (l.body) {
      l.body.forEach((b) => {
        if (b.c) {
          ctx.beginPath();
          ctx.arc(b.p.x, b.p.y, size, 0, TAU);
          ctx.fill();
        }
      });
    }
  });
}

function getElbowConnectedShapeIds(lines: LineShape[]): string[] {
  const ret = new Set<string>();

  lines.forEach((line) => {
    if (line.lineType !== "elbow") return;

    if (line.pConnection) {
      ret.add(line.pConnection.id);
    }

    if (line.qConnection) {
      ret.add(line.qConnection.id);
    }
  });

  return Array.from(ret.keys());
}

export function getConnectedLinePatch(srcComposite: ShapeComposite, patchInfo: EntityPatchInfo<Shape>) {
  if (!patchInfo.update) return {};

  const connectedLinesMap = getConnectedLineInfoMap(
    { getShapeComposite: () => srcComposite },
    Object.keys(patchInfo.update),
  );
  const handler = newConnectedLineHandler({
    connectedLinesMap,
    ctx: { getShapeComposite: () => srcComposite },
    keepConnection: true,
  });
  return handler.onModified(patchInfo.update);
}
