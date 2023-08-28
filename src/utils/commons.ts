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
