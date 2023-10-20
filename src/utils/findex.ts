import { generateKeyBetween } from "fractional-indexing";

/**
 * Works same as "generateKeyBetween".
 * Besides, when two values are same, returns the value.
 * It's possible enough that different entities have the same findex value under CRDT conversion situation.
 */
export function generateKeyBetweenAllowSame(a: string | null, b: string | null): string {
  return a && b && a === b ? a : generateKeyBetween(a, b);
}
