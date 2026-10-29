// Regression tests for issues found in code review before 0.1.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { toVisual, textWidth, detect, createVisualStream, shapeGraphemes } from '../dist/index.js';

const plain = { shape: false };
const escapes = (s) => s.match(/\x1b\[[0-9;:]*m/g) ?? [];

test('output size stays linear with chalk-style closing codes (39m, 22m)', () => {
  const line = '\x1b[32mשלום\x1b[39m עולם \x1b[1mחזק\x1b[22m';
  const input = Array.from({ length: 2000 }, () => line).join('\n');
  const out = toVisual(input, plain);
  assert.ok(out.length < input.length * 2, `output ${out.length} bytes for ${input.length} bytes of input`);
  // and colors still land on the same words
  const first = out.split('\n')[0];
  assert.match(first, /\x1b\[32mםולש/);
  assert.match(first, /\x1b\[1mקזח/);
});

test('rebuilt SGR keeps the meaning of closing codes', () => {
  const out = toVisual('\x1b[1;31mא\x1b[22mב\x1b[39mג', plain);
  // visual order: ג (plain), ב (red only), א (bold red)
  assert.equal(out, 'ג\x1b[31mב\x1b[0m\x1b[1;31mא\x1b[0m');
});

test('tab-separated RTL columns keep their order', () => {
  assert.equal(toVisual('id\tשם\tעיר', plain), 'id      םש      ריע');
  assert.equal(textWidth(toVisual('id\tשם\tעיר', plain)), textWidth('id      שם      עיר'));
});

test('malformed or hidden sequences make the line pass through unchanged', () => {
  for (const line of [
    '\x1b[\r31mאבג\x1b[39m',
    '\x1b]8;;http://x\x1b[1A\x07אחת',
    '\x1b[>4;2mשלום',
    '\x1b[\x1b8mשלום',
    'ש 2J\u009b',
    'ש 31m\u009b',
  ]) {
    assert.equal(toVisual(line), line, JSON.stringify(line));
  }
});

test('never emits escape sequences that were not built from known SGR parameters', () => {
  const out = toVisual('\x1b[38;5;196mא\x1b[48;2;1;2;3mב\x1b[4:3mג\x1b[0m', plain);
  for (const e of escapes(out)) assert.match(e, /^\x1b\[(0|[0-9;:]+)m$/);
  assert.ok(out.includes('38;5;196'));
  assert.ok(out.includes('48;2;1;2;3'));
});

test('grep-style erase-in-line and tput sgr0 are supported', () => {
  const grep = '\x1b[01;31m\x1b[Kשלום\x1b[m\x1b[K עולם';
  const out = toVisual(grep, plain);
  assert.notEqual(out, grep);
  assert.equal(out.replace(/\x1b\[[0-9;]*[mK]/g, ''), 'םלוע םולש');
  assert.ok(out.endsWith('\x1b[K'));
  const tput = '\x1b[31mשלום\x1b(B\x1b[m עולם';
  const out2 = toVisual(tput, plain);
  assert.notEqual(out2, tput);
  assert.ok(out2.startsWith('\x1b(B'));
});

test('detect: TERM_PROGRAM wins over inherited variables', () => {
  assert.equal(detect({ TERM_PROGRAM: 'vscode', VTE_VERSION: '7600' }).mode, 'reorder');
  assert.equal(detect({ TERM_PROGRAM: 'vscode', KONSOLE_VERSION: '240802' }).mode, 'reorder');
  assert.equal(detect({ TERM_PROGRAM: 'vscode', WT_SESSION: 'x' }).terminal, 'VS Code (xterm.js)');
  // tmux inside iTerm2 3.7 must not be flipped twice
  assert.equal(detect({ TERM_PROGRAM: 'tmux', LC_TERMINAL: 'iTerm2', LC_TERMINAL_VERSION: '3.7.3' }).mode, 'passthrough');
  assert.equal(detect({ TERM_PROGRAM: 'tmux' }).mode, 'reorder');
});

test('shaping covers alef wasla, Persian heh with yeh, and keeps joins across format characters', () => {
  assert.deepEqual(shapeGraphemes(['ب', '\u0671', 'ب']).map((g) => g.codePointAt(0)), [0xfe91, 0xfb51, 0xfe8f]);
  assert.deepEqual(shapeGraphemes(['ب', '\u06c0']).map((g) => g.codePointAt(0)), [0xfe91, 0xfba5]);
  // soft hyphen between two behs does not break the join
  assert.deepEqual(shapeGraphemes(['ب', '\u00ad', 'ب']).map((g) => g.codePointAt(0)), [0xfe91, 0x00ad, 0xfe90]);
  // noon ghunna has no encoded initial form: keep the base letter
  assert.equal(shapeGraphemes(['\u06ba', 'ب'])[0], '\u06ba');
});

test('wrapping never exceeds the width and drops the space it breaks at', () => {
  for (const [line, width] of [
    [' אב漢', 3],
    ['אבג דה', 3],
    ['אחת שתיים שלוש ארבע חמש', 7],
  ]) {
    const rows = toVisual(line, { ...plain, width, alignRtl: true }).split('\n');
    for (const r of rows) assert.ok(textWidth(r) <= Math.max(width, 2), `${JSON.stringify(r)} wider than ${width}`);
  }
  assert.deepEqual(toVisual('אבג דה', { ...plain, width: 3, alignRtl: true }).split('\n'), ['גבא', ' הד']);
});

test('emoji with default emoji presentation count as two columns', () => {
  assert.equal(textWidth('✅ תם'), 5);
  assert.equal(textWidth('⭐'), 2);
});

test('stream passes carriage-return progress through without waiting for a newline', async () => {
  const stream = createVisualStream();
  const chunks = [];
  stream.on('data', (d) => chunks.push(d.toString()));
  stream.write('10%\r20%\r30%');
  await new Promise((r) => setImmediate(r));
  assert.equal(chunks.join(''), '10%\r20%\r');
  stream.end();
  await new Promise((r) => stream.on('end', r));
  assert.equal(chunks.join(''), '10%\r20%\r30%');
});

test('stream output equals toVisual for a mixed document', async () => {
  const text = 'a\tב\tג\n\x1b[32mשלום\x1b[39m\r\nplain\n';
  let out = '';
  for await (const part of Readable.from([text]).pipe(createVisualStream(plain))) out += part;
  assert.equal(out, toVisual(text, plain));
});
