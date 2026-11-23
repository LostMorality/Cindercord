// Small @utils helpers Equicord plugins import.

export function makeRange(start: number, end: number, step = 1): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i += step) out.push(i);
  return out;
}

export function classes(...names: Array<string | false | undefined | null>): string {
  return names.filter(Boolean).join(" ");
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function identity<T>(v: T): T {
  return v;
}
