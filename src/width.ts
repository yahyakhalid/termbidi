// Terminal column width of a grapheme cluster. Covers the cases that matter
// for RTL text in terminals: combining marks and format characters take no
// column, East Asian wide characters and emoji take two, everything else one.

const ZERO_WIDTH = /^[\p{Mn}\p{Me}\p{Cf}\u200b\u2060\ufeff]+$/u;
const EMOJI = /\p{Extended_Pictographic}/u;

// Symbols below U+1F000 with East Asian Width W (emoji presentation by
// default), e.g. ⌚ ⏳ ☕ ⚡ ✅ ❌ ⭐.
const WIDE_SYMBOLS = new Set([
  0x231a, 0x231b, 0x23e9, 0x23ea, 0x23eb, 0x23ec, 0x23f0, 0x23f3, 0x25fd, 0x25fe, 0x2614, 0x2615, 0x267f, 0x2693,
  0x26a1, 0x26aa, 0x26ab, 0x26bd, 0x26be, 0x26c4, 0x26c5, 0x26ce, 0x26d4, 0x26ea, 0x26f2, 0x26f3, 0x26f5, 0x26fa,
  0x26fd, 0x2705, 0x270a, 0x270b, 0x2728, 0x274c, 0x274e, 0x2753, 0x2754, 0x2755, 0x2757, 0x2795, 0x2796, 0x2797,
  0x27b0, 0x27bf, 0x2b1b, 0x2b1c, 0x2b50, 0x2b55,
]);

function isWide(cp: number): boolean {
  if (WIDE_SYMBOLS.has(cp) || (cp >= 0x2648 && cp <= 0x2653)) return true;
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
}

export function graphemeWidth(g: string): number {
  if (g === '') return 0;
  if (ZERO_WIDTH.test(g)) return 0;
  const cp = g.codePointAt(0)!;
  if (cp < 0x20) return 0;
  if (isWide(cp)) return 2;
  if (EMOJI.test(g) && (g.includes('\ufe0f') || cp >= 0x1f000)) return 2;
  return 1;
}

const segmenter = new Intl.Segmenter('und', { granularity: 'grapheme' });

export function graphemes(text: string): string[] {
  const out: string[] = [];
  for (const s of segmenter.segment(text)) out.push(s.segment);
  return out;
}

/** Column width of plain text (no escape sequences). */
export function textWidth(text: string): number {
  let w = 0;
  for (const g of graphemes(text)) w += graphemeWidth(g);
  return w;
}
