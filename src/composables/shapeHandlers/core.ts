import { IVec2 } from "okageo";
import { StyleScheme } from "../../models";

interface ShapeHandlerHitResult {}

export interface ShapeHandler<H extends ShapeHandlerHitResult = any> {
  hitTest: (p: IVec2, scale: number) => H | undefined;
  render: (ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number) => void;
  /**
   * Returns true when "val" is different from the previous one.
   */
  saveHitResult: (val?: H) => boolean;
  retrieveHitResult: () => H | undefined;
}

export function defineShapeHandler<H extends ShapeHandlerHitResult, O>(
  createFn: (option: O) => Pick<ShapeHandler<H>, "hitTest" | "render"> & {
    isSameHitResult: (a?: H, b?: H) => boolean;
    render: (ctx: CanvasRenderingContext2D, style: StyleScheme, scale: number, hitResult?: H) => void;
  },
): (option: O) => ShapeHandler<H> {
  return (o) => {
    const handler = createFn(o);
    let hitResult: H | undefined;

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
