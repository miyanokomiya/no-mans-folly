// eslint-disable-next-line no-restricted-imports
import * as findexing from "fractional-indexing-jittered";

const _generateKeyBetween = process.env.VITEST ? findexing.generateKeyBetween : findexing.generateJitteredKeyBetween;
const _generateNKeysBetween = process.env.VITEST
  ? findexing.generateNKeysBetween
  : findexing.generateNJitteredKeysBetween;

/**
 * Works same as "generateKeyBetween".
 * Besides, when two values are same, returns the value.
 * It's possible enough that different entities have the same findex value under CRDT conversion situation.
 */
export function generateKeyBetweenAllowSame(a: string | null | undefined, b: string | null | undefined): string {
  return a && b && a === b ? a : _generateKeyBetween(a ?? null, b ?? null);
}

export function generateKeyBetween(a: string | null | undefined, b: string | null | undefined) {
  return _generateKeyBetween(a ?? null, b ?? null);
}
export function generateNKeysBetween(a: string | null | undefined, b: string | null | undefined, n: number) {
  return _generateNKeysBetween(a ?? null, b ?? null, n);
}
export function generateNKeysBetweenAllowSame(a: string | null | undefined, b: string | null | undefined, n: number) {
  return a && b && a === b ? [...Array(n)].map(() => a) : _generateNKeysBetween(a ?? null, b ?? null, n);
}

export function compareByFindex<T extends { findex: string }>(a: T, b: T): number {
  return a.findex <= b.findex ? -1 : 1;
}
