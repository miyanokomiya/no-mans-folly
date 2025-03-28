import { chromium } from "playwright";
import type { AppCanvasStateContext } from "../src/composables/states/appCanvas/core";
import type { IAppCanvasContext } from "../src/contexts/AppCanvasContext";

try {
  (async () => {
    // Setup
    const browser = await chromium.launch({ headless: false, devtools: false });
    // const context = await browser.newContext(devices["iPhone 11"]);
    const context = await browser.newContext({ baseURL: "http://localhost:5173", screen: { width: 500, height: 500 } });
    const page = await context.newPage();

    // The actual interesting bit
    // await context.route("**.jpg", (route) => route.abort());
    await page.goto("/");

    await page.click("text='Start with no workspace'");

    await page.evaluate(async () => {
      const app = (window as any).no_mans_folly;
      if (!app) return;

      const ctx = app.getStateContext() as AppCanvasStateContext;
      const shape = app.createShape(ctx.getShapeStruct, "rectangle", {
        id: ctx.generateUuid(),
        findex: ctx.createLastIndex(),
        p: { x: 50, y: 100 },
      });
      ctx.addShapes([shape]);
      ctx.selectShape(shape.id);
      ctx.toView(shape.p);
    });

    await page.evaluate(async () => {
      setTimeout(() => {
        const app = (window as any).no_mans_folly;
        if (!app) return;

        const actx = app.getAppCanvasContext() as IAppCanvasContext;
        const ctx = app.getStateContext() as AppCanvasStateContext;
        const shape = app.createShape(ctx.getShapeStruct, "rectangle", {
          id: ctx.generateUuid(),
          findex: ctx.createLastIndex(),
          p: { x: 250, y: 100 },
        });
        actx.shapeStore.addEntities([shape]);
      }, 3000);

      setTimeout(() => {
        const app = (window as any).no_mans_folly;
        if (!app) return;

        const actx = app.getAppCanvasContext() as IAppCanvasContext;
        const ctx = app.getStateContext() as AppCanvasStateContext;
        const shape = app.createShape(ctx.getShapeStruct, "rectangle", {
          id: ctx.generateUuid(),
          findex: ctx.createLastIndex(),
          p: { x: 250, y: 300 },
        });
        actx.shapeStore.addEntities([shape]);
      }, 5000);
    });

    // Teardown
    // await context.close();
    // await browser.close();
  })();
} catch (e) {
  console.error(e);
}
