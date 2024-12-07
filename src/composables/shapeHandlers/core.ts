import { IVec2 } from "okageo";
import { StyleScheme } from "../../models";

export interface ShapeHandler<HitResult = any> {
  hitTest: (p: IVec2, scale: number) => HitResult | undefined;
  render: (ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number) => void;
  /**
   * Returns true when "val" is different from the previous one.
   */
  saveHitResult: (val?: HitResult) => boolean;
  retrieveHitResult: () => HitResult | undefined;
}

export function defineShapeHandler<HitResult, O>(
  createFn: (option: O) => Pick<ShapeHandler<HitResult>, "hitTest"> & {
    isSameHitResult: (a?: HitResult, b?: HitResult) => boolean;
    render: (ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: HitResult) => void;
  },
): (option: O) => ShapeHandler<HitResult> {
  return (o) => {
    const handler = createFn(o);
    let hitResult: HitResult | undefined;

    return {
      ...handler,
      render: (ctx, style, scale) => {
        return handler.render(ctx, style, scale, hitResult);
      },
      saveHitResult: (val) => {
        const changed = !handler.isSameHitResult(hitResult, val);
        hitResult = val;
        return changed;
      },
      retrieveHitResult: () => hitResult,
    };
  };
}

export const newDummyHandler = defineShapeHandler<any, any>(() => {
  return {
    hitTest: () => {},
    render: () => {},
    isSameHitResult: () => true,
  };
});
