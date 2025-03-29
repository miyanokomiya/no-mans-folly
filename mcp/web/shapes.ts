import type { AppMcpContext } from "../../src/contexts/AppMcpContext";
import type { Shape } from "../../src/models";

// In this file, each function must be standalone and not depend on other ones.
// This is because the functions are used in the web context and are not bundled together.

type ShapeArgs = { type: string };

export async function addShape(args: ShapeArgs): Promise<string> {
  const app = (window as any).no_mans_folly as AppMcpContext | undefined;
  if (!app) return "";

  const accxt = app.getStateContext();
  const shape = app.createShape(accxt.getShapeStruct, args.type, {
    id: accxt.generateUuid(),
    findex: accxt.createLastIndex(),
    ...args,
  });
  accxt.addShapes([shape]);
  accxt.selectShape(shape.id);
  accxt.toView(shape.p);
  return shape.id;
}

export async function addShapes(args: ShapeArgs[]): Promise<string[]> {
  const app = (window as any).no_mans_folly as AppMcpContext | undefined;
  if (!app) return [];

  const accxt = app.getStateContext();
  let findex = accxt.createLastIndex();
  const shapes = args.map((data) => {
    findex = app.generateKeyBetweenAllowSame(findex, null);
    return app.createShape(accxt.getShapeStruct, data.type, {
      id: accxt.generateUuid(),
      findex,
      ...data,
    });
  });
  accxt.addShapes(shapes);
  return shapes.map((shape) => shape.id);
}

export function deleteShapes(ids: string[]): string[] {
  const app = (window as any).no_mans_folly as AppMcpContext | undefined;
  if (!app) return [];

  const accxt = app.getStateContext();
  const deletedIds = accxt
    .getShapeComposite()
    .getAllBranchMergedShapes(ids)
    .map((s) => s.id);
  accxt.deleteShapes(ids);
  return deletedIds;
}

export function getShapes(): Shape[] {
  const app = (window as any).no_mans_folly as AppMcpContext | undefined;
  if (!app) return [];

  const accxt = app.getStateContext();
  return accxt.getShapeComposite().shapes;
}

export function getShapeById(id: string): Shape | undefined {
  const app = (window as any).no_mans_folly as AppMcpContext | undefined;
  if (!app) return;

  const accxt = app.getStateContext();
  return accxt.getShapeComposite().shapeMap[id];
}
