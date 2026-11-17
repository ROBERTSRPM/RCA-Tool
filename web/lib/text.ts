/** Small pure text helpers shared by similarity, asset matching and rollout ranking. */

const STOP_WORDS = new Set(
  (
    "a an and are as at be been but by can did do does for from had has have if in into is it its " +
    "of on or our so than that the their them then there these they this to too was we were what " +
    "when where which while who why will with within without not no yes per via also after before " +
    "again about over under up down out off all any each more most other some such only same very " +
    "just about being both during further here how once own should would could may might must " +
    "failed failure failures fail fails failing event events happened happen issue problem repeat " +
    "repeated"
  ).split(/\s+/),
);

/** Lower case, trimmed, inner whitespace collapsed. "" for anything that is not a string. */
export function norm(s: unknown): string {
  return typeof s === "string" ? s.toLowerCase().replace(/\s+/g, " ").trim() : "";
}

/**
 * The significant words of a text: lower case, letters and digits only, at
 * least 3 characters, no stop-words, no plain numbers. Each word once.
 */
export function significantWords(text: unknown): string[] {
  const out = new Set<string>();
  for (const w of norm(text).split(/[^a-z0-9]+/)) {
    if (w.length < 3 || STOP_WORDS.has(w) || /^\d+$/.test(w)) continue;
    out.add(w);
  }
  return [...out];
}

/** Words found in both lists (both already significant-word lists). */
export function sharedWords(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((w) => set.has(w));
}

export function isStopWord(w: string): boolean {
  return STOP_WORDS.has(w);
}

/** True for a value that says something: not empty and not the catch-all "Other". */
export function meaningful(v: unknown): boolean {
  const t = norm(v);
  return t !== "" && t !== "other";
}
