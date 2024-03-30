// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Assertion, AsymmetricMatchersContaining } from "vitest";
import type { IVec2 } from "okageo";

interface CustomMatchers<R = unknown> {
  toEqualPoint: (p: IVec2) => R;
  toEqualPoints: (list: IVec2[]) => R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
