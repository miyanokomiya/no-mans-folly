import type { AppCanvasStateContext } from "../composables/states/appCanvas/core";
import type { CreateShape } from "../shapes";
import type { GenerateKeyBetweenAllowSame } from "../utils/findex";
import type { IAppCanvasContext } from "./AppCanvasContext";

export type AppMcpContext = {
  getAppCanvasContext: () => IAppCanvasContext;
  getStateContext: () => AppCanvasStateContext;
  createShape: CreateShape;
  generateKeyBetweenAllowSame: GenerateKeyBetweenAllowSame;
};
