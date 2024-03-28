interface KeywordFilterOption {
  keyword: string;
  maxHit?: number;
}

export function newKeywordFilter(option: KeywordFilterOption): <T>(
  list: Iterable<T>,
  getVal: (t: T) => string,
) => {
  result: T[];
  remaind: boolean;
} {
  const wordRegs = option.keyword
    .split(/ /)
    .filter((s) => !!s)
    .map((s) => new RegExp(s.toLowerCase()));

  return (list, getVal) => {
    const max = option.maxHit ?? Infinity;
    const result: any[] = [];
    let remaind = false;
    for (const t of list) {
      if (wordRegs.every((r) => r.test(getVal(t)))) {
        result.push(t);
        if (max <= result.length) {
          remaind = true;
          break;
        }
      }
    }
    return { result, remaind };
  };
}
