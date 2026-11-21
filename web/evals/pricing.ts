/**
 * Token prices in US dollars per million tokens, first-party Anthropic API (checked 2026-11).
 * Cache write is assumed to be 1.25x the input price (5-minute cache). Update when prices change.
 * A model that is not listed costs "unknown": the report says so instead of guessing.
 */
export interface Price {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const p = (input: number, output: number, cacheRead: number): Price => ({ input, output, cacheRead, cacheWrite: input * 1.25 });

const PRICES: [RegExp, Price][] = [
  [/^claude-sonnet-5-5/, p(2, 10, 0.1)],
  [/^claude-sonnet-5/, p(2, 10, 0.2)],
  [/^claude-sonnet-4-6/, p(3, 15, 0.3)],
  [/^claude-opus-5-5/, p(4, 20, 0.2)],
  [/^claude-opus-(5|4-8|4-7|4-6)/, p(5, 25, 0.5)],
  [/^claude-haiku-5-5/, p(0.1, 0.5, 0.01)],
  [/^claude-haiku-4-5/, p(1, 5, 0.1)],
  [/^claude-fable-5-2/, p(8, 40, 0.2)],
  [/^claude-fable-5/, p(10, 50, 1)],
];

export function priceFor(model: string): Price | null {
  return PRICES.find(([re]) => re.test(model))?.[1] ?? null;
}

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}
export const zeroUsage = (): Usage => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
export function addUsage(a: Usage, b: Usage): Usage {
  return { input: a.input + b.input, output: a.output + b.output, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite };
}

/** Maps an API usage object to our shape. */
export function fromApiUsage(u: unknown): Usage {
  const o = (u ?? {}) as Record<string, unknown>;
  const n = (k: string) => (typeof o[k] === "number" ? (o[k] as number) : 0);
  return { input: n("input_tokens"), output: n("output_tokens"), cacheRead: n("cache_read_input_tokens"), cacheWrite: n("cache_creation_input_tokens") };
}

export function costOf(u: Usage, model: string): number | null {
  const pr = priceFor(model);
  if (!pr) return null;
  return (u.input * pr.input + u.output * pr.output + u.cacheRead * pr.cacheRead + u.cacheWrite * pr.cacheWrite) / 1_000_000;
}

export const fmtUsd = (x: number | null): string => (x === null ? "unknown (no price listed for this model)" : `$${x.toFixed(x < 1 ? 3 : 2)}`);
