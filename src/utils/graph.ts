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
  const nodeps: string[] = [];

  {
    const finishedSet = new Set<string>();
    sorted.forEach((id) => {
      const deps = depSrc.get(id);
      if (!deps || deps.size === 0) {
        nodeps.push(id);
        finishedSet.add(id);
        return;
      }
    });
  }

  const ret: string[][] = [nodeps];
  {
    const singleDependantMap = getSingleDependantMap(depSrc);
    const finishedSet = new Set<string>();
    let currentSet = new Set<string>();
    sorted.forEach((id) => {
      if (finishedSet.has(id)) return;
      finishedSet.add(id);

      const deps = depSrc.get(id);
      if (!deps || deps.size === 0) return;

      for (const dep of deps) {
        if (currentSet.has(dep)) {
          ret.push(Array.from(currentSet));

          const nextSet = new Set<string>([id]);
          // Pick ones having single dependent on current ones.
          currentSet.forEach((idInCurrentSet) => {
            const dependantSet = singleDependantMap.get(idInCurrentSet);
            dependantSet?.forEach((did) => {
              nextSet.add(did);
              finishedSet.add(did);
            });
          });

          currentSet = nextSet;
          return;
        }
      }

      currentSet.add(id);
    });

    if (currentSet.size > 0) {
      ret.push(Array.from(currentSet));
    }
  }

  return ret;
}

export function getSingleDependantMap(depSrc: DependencyMap): DependencyMap {
  const ret: DependencyMap = new Map();
  for (const [id, deps] of depSrc) {
    if (deps.size !== 1) continue;

    const dep = deps.values().next().value!;
    const depandantSet = ret.get(dep);
    if (depandantSet) {
      depandantSet.add(id);
    } else {
      ret.set(dep, new Set([id]));
    }
  }
  return ret;
}

export function getAllDependants(depMap: DependencyMap, reversedDepMap: DependencyMap, targets: string[]): string[] {
  const targetSet = new Set(targets);
  const relatedSet = new Set<string>(targets);
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
  targets.forEach(step);

  const ret: string[] = [];
  relatedSet.forEach((id) => {
    if (targetSet.has(id)) return;
    const item = depMap.get(id);
    if (!item) return;
    ret.push(id);
  });
  return ret;
}

export function getAllDependencies(depMap: DependencyMap, targets: string[]): string[] {
  const targetSet = new Set(targets);
  const relatedSet = new Set(targets);
  const finishedSet = new Set<string>();

  const step = (id: string) => {
    if (finishedSet.has(id)) return;

    finishedSet.add(id);
    relatedSet.add(id);
    depMap.get(id)?.forEach(step);
  };
  targets.forEach(step);

  const ret: string[] = [];
  relatedSet.forEach((id) => {
    if (targetSet.has(id)) return;
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
      const val = ret.get(dep);
      if (val) {
        val.add(id);
      }
    }
  }

  return ret;
}
