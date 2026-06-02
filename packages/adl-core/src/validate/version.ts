/**
 * Version helpers for version-gated semantic rules.
 */

/**
 * True when the document's declared adl_spec is at least major.minor.
 * Rules introduced in a given ADL version apply only to documents that
 * declare that version or later; earlier documents are validated under the
 * rules of their own version.
 */
export function specAtLeast(
  adlSpec: string | undefined,
  major: number,
  minor: number,
): boolean {
  if (typeof adlSpec !== "string") return false;
  const m = /^(\d+)\.(\d+)/.exec(adlSpec);
  if (!m) return false;
  const maj = Number(m[1]);
  const min = Number(m[2]);
  return maj > major || (maj === major && min >= minor);
}
