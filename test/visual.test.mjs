import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toVisual, lineToVisual, textWidth, hasRtl } from '../dist/index.js';

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\]8;[^\x1b\x07]*(\x1b\\|\x07)/g, '');
const plain = { shape: false };

test('reverses a Hebrew line', () => {
  assert.equal(toVisual('שלום עולם', plain), 'םלוע םולש');
});

test('keeps embedded LTR text and numbers in reading order', () => {
  assert.equal(toVisual('Hello שלום world', plain), 'Hello םולש world');
  assert.equal(toVisual('גרסה 1.2.3 זמינה', plain), 'הנימז 1.2.3 הסרג');
});

test('mirrors brackets inside right-to-left runs', () => {
  assert.equal(toVisual('שלום (test)', plain), '(test) םולש');
  assert.equal(toVisual('(مرحبا) [عالم]', plain), '[ملاع] (ابحرم)');
});

test('leaves lines without RTL characters byte-for-byte unchanged', () => {
  const lines = ['plain text', '\x1b[31mred\x1b[0m and \x1b[1mbold\x1b[0m', '', '   ', '12345'];
  for (const l of lines) assert.equal(toVisual(l), l);
  assert.equal(hasRtl('abc'), false);
  assert.equal(hasRtl('abc ש'), true);
});

test('keeps each character in its own color', () => {
  const input = '\x1b[32mנחשב\x1b[0m שורה \x1b[31mאדום\x1b[0m';
  const out = toVisual(input, plain);
  assert.equal(strip(out), 'םודא הרוש בשחנ');
  // the green word is still green and the red word still red
  assert.match(out, /\x1b\[31mםודא/);
  assert.match(out, /\x1b\[32mבשחנ/);
  // and the line ends in the same state it started (reset)
  assert.ok(out.endsWith('\x1b[0m') || !out.includes('\x1b[3'));
});

test('carries a style that is still open at the end of a line', () => {
  const out = toVisual('\x1b[33mשורה ראשונה\nשורה שנייה\x1b[0m', plain);
  const [first, second] = out.split('\n');
  assert.equal(strip(first), 'הנושאר הרוש');
  assert.equal(strip(second), 'היינש הרוש');
  // the first line leaves yellow on, as the original did
  assert.ok(first.includes('\x1b[33m'));
  assert.ok(!first.endsWith('\x1b[0m'));
});

test('keeps OSC 8 hyperlinks around the same text', () => {
  const link = '\x1b]8;;https://example.com\x1b\\';
  const close = '\x1b]8;;\x1b\\';
  const out = toVisual(`ראה ${link}קישור${close} כאן`, plain);
  assert.equal(strip(out), 'ןאכ רושיק האר');
  assert.ok(out.includes(`${link}רושיק${close}`));
});

test('keeps combining marks after their base letter', () => {
  const out = toVisual('الد\u064e\u0651ر\u0652س\u064f', plain);
  assert.ok(!/^\p{Mn}/u.test(out), 'output must not start with a combining mark');
  assert.equal(out.replace(/\p{Mn}/gu, ''), 'سردلا');
});

test('keeps ZWNJ between the same two letters', () => {
  const out = toVisual('فایل\u200cها', plain);
  assert.equal(out, 'اه\u200cلیاف');
});

test('does not change the column width of a line', () => {
  for (const line of ['مرحبا بالعالم', 'تم تثبيت 42 حزمة', 'نجح 😊 جدا\u064b', 'فایل\u200cها', 'لا إله إلا الله']) {
    assert.equal(textWidth(strip(toVisual(line))), textWidth(line), line);
  }
});

test('shapes Arabic letters into joined forms', () => {
  // seen, lam (medial), alef (final), meem (isolated after alef)
  assert.equal(toVisual('سلام'), '\ufee1\ufe8e\ufee0\ufeb3');
  // dal and alef never join forward, so every letter of "دار" is isolated
  assert.equal(toVisual('دار'), '\ufead\ufe8d\ufea9');
  // beh joins forward: initial beh, final alef, isolated beh
  assert.equal(toVisual('باب'), '\ufe8f\ufe8e\ufe91');
});

test('ligatures option merges lam and alef', () => {
  const out = toVisual('لا', { ligatures: true });
  assert.equal(out, '\ufefb');
  assert.equal(toVisual('سلام', { ligatures: true }), '\ufee1\ufefc\ufeb3');
});

test('wraps long lines before reordering', () => {
  const line = 'אחת שתיים שלוש ארבע חמש שש';
  const out = toVisual(line, { ...plain, width: 12 });
  const rows = out.split('\n');
  assert.ok(rows.length > 1);
  for (const r of rows) assert.ok(textWidth(r) <= 12, `"${r}" is wider than 12`);
  // the first display line holds the first words of the sentence
  assert.ok(rows[0]?.includes('תחא'));
  assert.ok(rows.at(-1)?.includes('שש'));
});

test('alignRtl right-aligns RTL lines to the width', () => {
  const out = toVisual('שלום', { ...plain, width: 10, alignRtl: true });
  assert.equal(out, '      םולש');
});

test('leaves lines with cursor movement untouched', () => {
  const line = 'שלום\x1b[2K\x1b[1G';
  assert.equal(toVisual(line), line);
  assert.equal(toVisual('שלום\rעולם'), 'שלום\rעולם');
});

test('expands tabs before reordering', () => {
  assert.equal(toVisual('א\tב', plain), 'ב       א');
});

test('lineToVisual reports the style at the end of the line', () => {
  const { carry } = lineToVisual('\x1b[1mשלום');
  assert.equal(carry.sgr, '\x1b[1m');
  assert.equal(carry.link, '');
});

test('direction option forces the base direction', () => {
  assert.equal(toVisual('abc שלום', { ...plain, direction: 'rtl' }), 'םולש abc');
  assert.equal(toVisual('שלום abc', { ...plain, direction: 'ltr' }), 'םולש abc');
});
