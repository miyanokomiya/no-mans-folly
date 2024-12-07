import type {
  Assertion as SrcAssertion,
  AsymmetricMatchersContaining as SrcAsymmetricMatchersContaining,
} from "vitest";
import type { IRectangle, IVec2 } from "okageo";

interface CustomMatchers<R = unknown> {
  toEqualPoint: (p: IVec2) => R;
  toEqualPoints: (list: IVec2[]) => R;
  toEqualRect: (rect: IRectangle) => R;
}

declare module "vitest" {
  interface Assertion<T = any> extends SrcAssertion, CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends SrcAsymmetricMatchersContaining, CustomMatchers {}
}
