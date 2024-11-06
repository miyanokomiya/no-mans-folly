// Meaning: "key" depends on its "values"
export type DependencyMap = Map<string, Set<string>>;

export function topSort(depSrc: DependencyMap, strict = false): string[] {
  const ret: string[] = [];
  const unresolved = new Set(depSrc.keys());
  const processed = new Set();

  const ctx = {
    resolve(id: string) {
      if (depSrc.has(id) && unresolved.has(id)) {
        ret.push(id);
      }
      unresolved.delete(id);
    },
    getDeps(id: string) {
      if (processed.has(id)) {
        if (strict) throw new Error("Circular dependency is detected.");
        return undefined;
      }
      processed.add(id);
      return depSrc.get(id);
    },
  };

  while (unresolved.size > 0) {
    topSortStep(ctx, unresolved.values().next().value!);
  }

  return ret;
}

function topSortStep(
  ctx: {
    resolve: (id: string) => void;
    getDeps: (id: string) => Set<string> | undefined;
  },
  target: string,
) {
  const deps = ctx.getDeps(target);
  if (deps) {
    deps.forEach((child) => topSortStep(ctx, child));
  }
  ctx.resolve(target);
}

/**
 * Items in the same hierarchy are independent from each other.
 * This hierarchy only regards items having single dependency. This isn't perfect but much performant.
 */
export function topSortHierarchy(depSrc: DependencyMap, strict = false): string[][] {
  const sorted = topSort(depSrc, strict);

  const ret: string[][] = [];
  const nodeps: string[] = [];
  const singledeps = new Map<string, string[]>();
  const others: string[] = [];

  sorted.forEach((id) => {
    const deps = depSrc.get(id);
    if (!deps || deps.size === 0) {
      nodeps.push(id);
    } else if (deps.size === 1) {
      const dep = deps.values().next().value!;
      if (singledeps.has(dep)) {
        singledeps.get(dep)!.push(id);
      } else {
        singledeps.set(dep, [id]);
      }
    } else {
      others.push(id);
    }
  });

  ret.push(nodeps);
  singledeps.forEach((keys) => ret.push(keys));
  others.forEach((key) => ret.push([key]));

  return ret;
}
