export function addSuffixToAvoidDuplication(src: string[]): string[] {
  const infoMap = new Map<string, number>();
  return src.map((s) => {
    const info = infoMap.get(s);
    if (info === undefined) {
      infoMap.set(s, 0);
      return s;
    }

    const num = info + 1;
    infoMap.set(s, num);
    return `${s}(${num})`;
  });
}
