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
 * This hierarchy isn't optimal but much performant.
 */
export function topSortHierarchy(depSrc: DependencyMap, strict = false): string[][] {
  const sorted = topSort(depSrc, strict);
  const finishedSet = new Set<string>();

  const nodeps: string[] = [];
  sorted.forEach((id) => {
    const deps = depSrc.get(id);
    if (!deps || deps.size === 0) {
      nodeps.push(id);
      finishedSet.add(id);
      return;
    }
  });

  const ret: string[][] = [nodeps];
  let currentSet = new Set<string>();
  sorted.forEach((id) => {
    const deps = depSrc.get(id);
    if (!deps || deps.size === 0) return;

    for (const dep of deps) {
      if (currentSet.has(dep)) {
        if (currentSet.size > 0) {
          ret.push(Array.from(currentSet));
        }
        currentSet = new Set([id]);
        return;
      }
    }

    currentSet.add(id);
  });
  if (currentSet.size > 0) {
    ret.push(Array.from(currentSet));
  }

  return ret;
}

export function getAllDependants(depMap: DependencyMap, reversedDepMap: DependencyMap, target: string): string[] {
  const relatedSet = new Set<string>([target]);
  const finishedSet = new Set<string>();

  const step = (id: string) => {
    if (finishedSet.has(id)) return;
    finishedSet.add(id);

    const deps = depMap.get(id);
    if (!deps) return;

    for (const dep of deps) {
      if (relatedSet.has(dep)) {
        relatedSet.add(id);
        break;
      }
    }

    if (relatedSet.has(id)) {
      const dependants = reversedDepMap.get(id);
      dependants?.forEach(step);
    }
  };
  step(target);

  const ret: string[] = [];
  relatedSet.forEach((id) => {
    if (id === target) return;
    const item = depMap.get(id);
    if (!item) return;
    ret.push(id);
  });
  return ret;
}

export function reverseDepMap(depSrc: DependencyMap): DependencyMap {
  const ret: DependencyMap = new Map();

  for (const [id] of depSrc) {
    ret.set(id, new Set());
  }

  for (const [id, deps] of depSrc) {
    for (const dep of deps) {
      ret.get(dep)!.add(id);
    }
  }

  return ret;
}
