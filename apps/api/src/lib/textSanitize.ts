import { HttpError } from './errors';

const REPLACEMENT_CHAR = '�';

/**
 * U+FFFD (the Unicode replacement character) is never a legitimate
 * character to store — its presence means an invalid byte sequence was
 * already lost during some earlier encode/decode step (a copy-paste from a
 * different codepage, a truncated multi-byte sequence, etc.) before the
 * text ever reached us. By the time a string contains U+FFFD, the original
 * character is unrecoverable — silently storing it just persists visible
 * mojibake (found 2026-08-27: a cohort title rendered "AI Engineering
 * <replacement char> Fall 2026" in the admin dropdown). Rejecting the
 * write at the API boundary surfaces the problem immediately, while the
 * source text (still in the client's input field) is still recoverable —
 * far cheaper than a silent DB scan for U+FFFD after the fact.
 */
export function assertNoReplacementChar(value: string | null | undefined, fieldName: string): void {
  if (value && value.includes(REPLACEMENT_CHAR)) {
    throw new HttpError(400, `${fieldName} contains an invalid character (likely from a copy-paste encoding issue) — please retype it.`);
  }
}
