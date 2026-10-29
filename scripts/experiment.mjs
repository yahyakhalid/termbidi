// Feasibility experiment for termbidi. Run: node scripts/experiment.mjs <python-with-python-bidi>
//
// 1. Ordering: our visual order (shaping off) vs. python-bidi, an independent
//    implementation (Rust unicode-bidi), on test/fixtures/corpus.txt.
// 2. Colors: every word gets its own ANSI color; each word must come out with
//    exactly its own color, and stripping the colors must give the same text
//    as the uncolored run.
// 3. Width: the output must take the same number of columns as the input.
// 4. Baseline: the same colored lines through python-bidi, to see what a
//    plain bidi tool does to escape sequences.
// 5. Speed: lines per second on a mixed workload.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toVisual, textWidth } from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const python = process.argv[2] ?? 'python';
const lines = readFileSync(join(root, 'test/fixtures/corpus.txt'), 'utf8').replace(/\n$/, '').split('\n');
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const seg = new Intl.Segmenter('und', { granularity: 'grapheme' });
const gs = (s) => Array.from(seg.segment(s), (x) => x.segment);
const rtl = (s) => /[\u0590-\u08ff]/.test(s);

// 1. Ordering vs reference
const ref = execFileSync(python, [join(root, 'scripts/ref_bidi.py')], { input: lines.join('\n'), env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
  .toString('utf8')
  .split('\n')
  .slice(0, lines.length);
// python-bidi does not mirror brackets (UAX #9 rule L4) and reverses combining
// marks with their base letter, which puts each mark *before* its letter.
// Terminals need mirrored brackets and marks after their letter, so termbidi
// does both. Differences that disappear once brackets are un-mirrored and
// marks are dropped are counted as "explained"; anything else is a mismatch.
const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '\u00ab': '\u00bb', '\u00bb': '\u00ab' };
const marksAfterBase = (s) => !/(^|\s)\p{Mn}/u.test(s);
const ordering = lines.map((line, i) => {
  const ours = toVisual(line, { shape: false });
  return { line, ours, ref: ref[i], match: ours === ref[i], explained: false };
});
for (const o of ordering) {
  if (o.match) continue;
  // Un-mirror ours (ref has none), drop marks from both.
  const oursNorm = o.ours.replace(/\p{Mn}/gu, '').replace(/[()[\]{}<>\u00ab\u00bb]/g, (c) => MIRROR[c]);
  const refNorm = o.ref.replace(/\p{Mn}/gu, '');
  o.explained = oursNorm === refNorm && marksAfterBase(o.ours);
}
const rtlLines = ordering.filter((o) => rtl(o.line));

// 2 + 3. Colors and width
const COLORS = [31, 32, 33, 34, 35, 36];
const colorize = (line) => {
  let k = 0;
  return line.replace(/\S+/g, (w) => `\x1b[${COLORS[k++ % COLORS.length]}m${w}\x1b[0m`);
};
const colorResults = lines.map((line) => {
  const colored = colorize(line);
  const out = toVisual(colored, { shape: false });
  const plainOut = toVisual(line, { shape: false });
  // Every character must keep its color: compare, per color, the multiset of
  // non-space characters in the input with the one in the output.
  const bag = (pairs) => {
    const m = new Map();
    for (const [color, ch] of pairs) {
      if (/\s/.test(ch)) continue;
      // A bracket and its mirror count as the same character.
      const key = `${color}|${MIRROR[ch] ? [ch, MIRROR[ch]].sort().join('') : ch}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  };
  const charsWithColor = (s) => {
    const pairs = [];
    let cur = 'none';
    const re = /\x1b\[([0-9;]*)m|([^\x1b])/gu;
    let m;
    while ((m = re.exec(s))) {
      if (m[1] !== undefined) cur = m[1] === '' || m[1] === '0' ? 'none' : m[1];
      else pairs.push([cur, m[2]]);
    }
    return pairs;
  };
  const inBag = bag(charsWithColor(colored));
  const outBag = bag(charsWithColor(out));
  let colorOk = inBag.size === outBag.size;
  for (const [key, n] of inBag) if (outBag.get(key) !== n) colorOk = false;
  const textOk = strip(out) === plainOut;
  const widthOk =
    textWidth(strip(toVisual(colored))) === textWidth(line) && textWidth(strip(out)) === textWidth(line);
  return { line, colorOk, textOk, widthOk };
});

// 4. Baseline: python-bidi on colored lines
const refColored = execFileSync(python, [join(root, 'scripts/ref_bidi.py')], {
  input: lines.map(colorize).join('\n'),
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
})
  .toString('utf8')
  .split('\n')
  .slice(0, lines.length);
const baseline = lines.map((line, i) => {
  const colored = colorize(line);
  const expectedSeqs = (colored.match(/\x1b\[[0-9;]*m/g) ?? []).length;
  const intact = (refColored[i].match(/\x1b\[[0-9;]*m/g) ?? []).length;
  return { line, rtl: rtl(line), intact: intact === expectedSeqs };
});

// 5. Speed
const work = [];
for (let i = 0; i < 100_000; i++) work.push(colorize(lines[i % lines.length]));
const text = work.join('\n');
const t0 = performance.now();
toVisual(text);
const ms = performance.now() - t0;

const summary = {
  date: new Date().toISOString(),
  node: process.version,
  corpusLines: lines.length,
  rtlLines: rtlLines.length,
  orderingMatches: rtlLines.filter((o) => o.match).length,
  orderingExplainedDifferences: rtlLines.filter((o) => o.explained).length,
  orderingRealMismatches: rtlLines.filter((o) => !o.match && !o.explained).length,
  ltrUnchanged: ordering.filter((o) => !rtl(o.line)).every((o) => o.ours === o.line),
  colorFidelity: colorResults.filter((r) => r.colorOk).length,
  strippedEqualsPlain: colorResults.filter((r) => r.textOk).length,
  widthPreserved: colorResults.filter((r) => r.widthOk).length,
  baselineRtlLinesWithIntactEscapes: baseline.filter((b) => b.rtl && b.intact).length,
  speed: { lines: work.length, ms: Math.round(ms), linesPerSecond: Math.round(work.length / (ms / 1000)) },
  mismatches: rtlLines.filter((o) => !o.match).map(({ line, ours, ref, explained }) => ({ line, ours, ref, explained })),
  colorFailures: colorResults.filter((r) => !r.colorOk || !r.textOk).map((r) => r.line),
  widthFailures: colorResults.filter((r) => !r.widthOk).map((r) => r.line),
};
mkdirSync(join(root, 'docs/experiment'), { recursive: true });
writeFileSync(join(root, 'docs/experiment/results.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, mismatches: summary.mismatches.length, colorFailures: summary.colorFailures, widthFailures: summary.widthFailures }, null, 2));
