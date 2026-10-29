// Checks termbidi's reordering against the Unicode conformance file
// BidiCharacterTest.txt (https://www.unicode.org/Public/UCD/latest/ucd/).
//   node scripts/conformance.mjs path/to/BidiCharacterTest.txt
//
// termbidi works on grapheme clusters (so combining marks stay after their
// letter) and expands tabs, so test cases where that intentionally differs
// from the per-code-point reference are skipped and counted:
//   - strings where a grapheme has more than one code point
//   - strings with control characters (tabs, paragraph separators, ...)
// Mirrored brackets are compared as the same character, because the
// reference lists positions, not mirrored glyphs.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as bidiModule from 'bidi-js';
import { toVisual } from '../dist/index.js';

const factory = typeof bidiModule.default === 'function' ? bidiModule.default : bidiModule;
const bidi = factory();
const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/conformance.mjs BidiCharacterTest.txt');
  process.exit(2);
}

const seg = new Intl.Segmenter('und', { granularity: 'grapheme' });
const canon = (ch) => {
  const m = bidi.getMirroredCharacter(ch);
  return m && m < ch ? m : ch;
};
// Characters removed by rule X9 do not appear in the reference ordering.
const X9 = /[\u202a-\u202e\u200b-\u200d\u2060-\u2064\ufeff\u00ad\u180e]/u;

let total = 0;
let pass = 0;
let skipped = 0;
const failures = [];
for (const raw of readFileSync(file, 'utf8').split('\n')) {
  if (!raw || raw.startsWith('#')) continue;
  const [cps, dir, , , order] = raw.split(';');
  const chars = cps.trim().split(' ').map((h) => String.fromCodePoint(parseInt(h, 16)));
  const text = chars.join('');
  const graphemeCount = [...seg.segment(text)].length;
  if (graphemeCount !== chars.length || /[\u0000-\u001f\u0085\u{2028}\u{2029}]/u.test(text) || /\p{M}/u.test(text)) {
    skipped++;
    continue;
  }
  total++;
  const direction = dir === '0' ? 'ltr' : dir === '1' ? 'rtl' : 'auto';
  const expected = order.trim() === '' ? '' : order.trim().split(' ').map((i) => canon(chars[Number(i)])).join('');
  const got = [...toVisual(text, { shape: false, direction })].filter((c) => !X9.test(c)).map(canon).join('');
  if (got === expected) pass++;
  else if (failures.length < 10) failures.push({ cps: cps.trim(), dir, expected, got });
}

const result = { file: basename(file), total, pass, fail: total - pass, skipped, passRate: `${((pass / total) * 100).toFixed(2)}%` };
console.log(JSON.stringify(result, null, 2));
if (failures.length) console.log('first failures:', failures);
