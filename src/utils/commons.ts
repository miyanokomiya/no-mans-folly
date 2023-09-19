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
  checkFn: (t: T, key: string) => boolean
): { [key: string]: T } {
  return Object.keys(origin).reduce<{ [key: string]: T }>((p, c) => {
    if (checkFn(origin[c], c)) {
      p[c] = origin[c];
    }
    return p;
  }, {});
}
