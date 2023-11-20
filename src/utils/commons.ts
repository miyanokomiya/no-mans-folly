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
  return Object.keys(map).map((key) => map[key]);
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
  return Object.keys({ ...src, ...override }).reduce<{ [key: string]: T }>((p, c) => {
    p[c] = { ...(src[c] ?? {}), ...(override[c] ?? {}) } as T;
    return p;
  }, {});
}

export function remap<T>(src: { [id: string]: T }, newToOldMap: { [newId: string]: string }): { [id: string]: T } {
  return Object.keys(newToOldMap).reduce<{ [id: string]: T }>((m, newId) => {
    const oldId = newToOldMap[newId];
    const doc = src[oldId];
    if (doc) {
      m[newId] = doc;
    }
    return m;
  }, {});
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
  return Object.keys(origin).reduce<{ [key: string]: T }>((p, c) => {
    if (checkFn(origin[c], c)) {
      p[c] = origin[c];
    }
    return p;
  }, {});
}

export function mapReduce<T, R, K extends string>(map: { [key in K]?: T }, fn: (t: T, key: K) => R): { [key in K]: R } {
  return Object.keys(map).reduce<any>((p, c) => {
    p[c] = fn((map as any)[c], c as K);
    return p;
  }, {});
}

export function patchPipe<T extends { id: string }>(
  patchFns: Array<
    (itemMap: { [id: string]: T }, patchMap: { [id: string]: Partial<T> }) => { [id: string]: Partial<T> }
  >,
  src: { [id: string]: T },
): { patch: { [id: string]: Partial<T> }; result: { [id: string]: T } } {
  let currentResult = src;
  let currentPatch = {};
  patchFns.forEach((fn) => {
    const patch = fn(currentResult, currentPatch);
    currentPatch = mergeMap(currentPatch, patch);
    currentResult = mergeMap(currentResult, currentPatch);
  });
  return { patch: currentPatch, result: currentResult };
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
 * "src" must have at least one item.
 * This function should be faster than doing "src.sort(...)[0]".
 */
export function pickMinItem<T>(src: T[], getValue: (item: T) => number): T {
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
