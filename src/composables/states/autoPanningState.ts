import { IRectangle } from "okageo";
import { lerpRect } from "../../utils/geometry";
import { defineAsyncState } from "./asyncState";

const STEP = 1000 / 60;

interface Option {
  viewRect: IRectangle;
  duration?: number;
}

export const newAutoPanningState = defineAsyncState((asyncCtx, option: Option) => {
  const duration = option.duration ?? 1000;
  let timer: any;

  return {
    getLabel: () => "AutoPanning",
    onStart: (ctx) => {
      const initialViewRect = ctx.getViewRect();

      if (duration === 0) {
        ctx.setViewport(option.viewRect);
        asyncCtx.resolve({ type: "break" });
        return;
      }

      let t = 0;
      function proc() {
        timer = setTimeout(() => {
          t = Math.min(t + STEP, duration);
          ctx.setViewport(lerpRect(initialViewRect, option.viewRect, t / duration));

          if (t < duration) {
            proc();
          } else {
            asyncCtx.resolve({ type: "break" });
          }
        }, STEP);
      }
      proc();
    },
    onEnd: () => {
      if (timer) {
        clearTimeout(timer);
      }
    },
    handleEvent: (_ctx, event) => {
      switch (event.type) {
        case "pointerdown":
          asyncCtx.resolve({ type: "break" });
          return;
      }
    },
  };
});
