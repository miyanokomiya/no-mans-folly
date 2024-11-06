import { clamp } from "okageo";

export function toKeyMap<T extends object>(list: T[], key: string | number): { [key: string]: T } {
  return list.reduce<{ [key: string]: T }>((p, c: any) => {
    const k = c[key];
    p[k] = c;
    return p;
  }, {});
}

export function toMap<T extends { id: string }>(list: T[]): { [id: string]: T } {
  return toKeyMap(list, "id");
}

export function toList<T>(map: { [key: string]: T }): T[] {
  return Object.values(map);
}

export function findBackward<T>(list: T[], predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined {
  let ret: T | undefined;

  for (let i = list.length - 1; 0 <= i; i--) {
    const d = list[i];
    if (predicate(d, i, list)) {
      ret = d;
      break;
    }
  }

  return ret;
}

export function mergeMap<T>(src: { [key: string]: T }, override: { [key: string]: T }): { [key: string]: T } {
  const finished = new Set<string>();

  const step = (c: string) => {
    const s = src[c];
    const o = override[c];
    if (!s) {
      return o;
    } else if (!o) {
      return s;
    } else {
      return { ...s, ...o } as T;
    }
  };

  const ret: { [key: string]: T } = {};
  mapEach(src, (_, key) => {
    ret[key] = step(key);
    finished.add(key);
  });
  mapEach(override, (_, key) => {
    if (finished.has(key)) return;
    ret[key] = step(key);
    finished.add(key);
  });
  return ret;
}

export function remap<T>(src: { [id: string]: T }, newToOldMap: { [newId: string]: string }): { [id: string]: T } {
  const ret: { [id: string]: T } = {};
  mapReduce(newToOldMap, (_, newId) => {
    const oldId = newToOldMap[newId];
    const doc = src[oldId];
    if (doc) {
      ret[newId] = doc;
    }
  });
  return ret;
}

export function mapDataToObj<T>(src: [string, T][]): { [id: string]: T } {
  return src.reduce<{ [id: string]: T }>((m, [id, v]) => {
    m[id] = v;
    return m;
  }, {});
}

export function mapFilter<T>(
  origin: { [key: string]: T },
  checkFn: (t: T, key: string) => boolean,
): { [key: string]: T } {
  const ret = {} as { [key: string]: T };
  for (const key in origin) {
    if (checkFn(origin[key], key)) {
      ret[key] = origin[key];
    }
  }
  return ret;
}

export function mapReduce<T, R, K extends string>(map: { [key in K]: T }, fn: (t: T, key: K) => R): { [key in K]: R } {
  const ret = {} as { [key in K]: R };
  for (const key in map) {
    ret[key] = fn(map[key], key);
  }
  return ret;
}

export function mapEach<T, K extends string>(map: { [key in K]: T }, fn: (t: T, key: K) => void) {
  for (const key in map) {
    fn(map[key], key);
  }
}

export type PatchPipeItem<T extends { id: string }> = (
  itemMap: { [id: string]: T },
  patchMap: { [id: string]: Partial<T> },
) => { [id: string]: Partial<T> };

export function patchPipe<T extends { id: string }>(
  patchFns: PatchPipeItem<T>[],
  src: { [id: string]: T },
  initialParch: { [id: string]: Partial<T> } = {},
): { patch: { [id: string]: Partial<T> }; result: { [id: string]: T }; patchList: { [id: string]: Partial<T> }[] } {
  let currentResult = src;
  let currentPatch = initialParch;
  const patchList: { [id: string]: Partial<T> }[] = [];
  patchFns.forEach((fn) => {
    const patch = fn(currentResult, currentPatch);
    currentPatch = mergeMap(currentPatch, patch);
    currentResult = mergeMap(currentResult, currentPatch) as { [id: string]: T };
    patchList.push(patch);
  });
  return { patch: currentPatch, result: currentResult, patchList };
}

export function groupBy<T>(src: T[], fn: (item: T) => string | number): { [key: string]: T[] } {
  const ret: { [key: string]: T[] } = {};
  src.forEach((item) => {
    const key = fn(item);
    if (ret[key]) {
      ret[key].push(item);
    } else {
      ret[key] = [item];
    }
  });
  return ret;
}

export function getFirstItemOfMap<T>(map: Map<any, T>): T | undefined {
  return map.size > 0 ? map.values().next().value! : undefined;
}

export function getlastItemOfMap<T>(map: Map<any, T>): T | undefined {
  return map.size > 0 ? Array.from(map.values())[map.size - 1] : undefined;
}

export function findexSortFn<T extends { findex: string }>(a: T, b: T): number {
  return a.findex <= b.findex ? -1 : 1;
}

/**
 * This function should be faster than doing "src.sort(...)[0]".
 */
export function pickMinItem<T>(src: T[], getValue: (item: T) => number): T | undefined {
  if (src.length === 0) return;

  let ret = src[0];
  let d = getValue(ret);
  for (let i = 1; i < src.length; i++) {
    const item = src[i];
    const itemD = getValue(item);
    if (itemD < d) {
      ret = item;
      d = itemD;
    }
  }
  return ret;
}

export function splitList<T>(
  list: T[],
  checkfn: (item: T, i: number) => boolean = (item) => !!item,
): [trueList: T[], falseList: T[]] {
  const t: T[] = [];
  const f: T[] = [];
  list.forEach((item, i) => {
    if (checkfn(item, i)) {
      t.push(item);
    } else {
      f.push(item);
    }
  });
  return [t, f];
}

export function convertObjectToMap<T>(obj: { [key: string]: T }): Map<string, T> {
  return new Map(Object.entries(obj));
}

export function convertMapToObject<T>(map: Map<string, T>): { [key: string]: T } {
  const ret: { [key: string]: T } = {};
  map.forEach((val, key) => {
    ret[key] = val;
  });
  return ret;
}

/**
 * "undefined" property is considered as non-empty value unless "ignoreUndefined" is set true.
 */
export function isObjectEmpty<T extends object>(obj: T, ignoreUndefined = false): boolean {
  for (const key in obj) {
    if (ignoreUndefined && obj[key] === undefined) {
      continue;
    }
    return false;
  }
  return true;
}

/**
 * This method always returns new array.
 */
export function fillArray<T>(count: number, initialValue: T, src: T[] = []): T[] {
  const ret: T[] = src.concat();
  while (ret.length < count) {
    ret.push(initialValue);
  }
  return ret;
}

export function slideSubArray<T>(src: T[], range: [from: number, count: number], to: number): T[] {
  const rangeFrom = range[0];
  const rangeTo = rangeFrom + range[1] - 1;
  const [sub, others] = splitList(src, (_, i) => rangeFrom <= i && i <= rangeTo);
  others.splice(clamp(0, src.length, to), 0, ...sub);
  return others;
}
