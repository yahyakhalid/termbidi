import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { detect, createVisualStream, forTerminal, toVisual } from '../dist/index.js';

const cli = fileURLToPath(new URL('../bin/termbidi.js', import.meta.url));

test('detect: TERMBIDI overrides everything', () => {
  assert.equal(detect({ TERMBIDI: 'off', WT_SESSION: '1' }).mode, 'passthrough');
  assert.equal(detect({ TERMBIDI: 'on', TERM_PROGRAM: 'iTerm.app', TERM_PROGRAM_VERSION: '3.7.3' }).mode, 'reorder');
  assert.equal(detect({ TERMBIDI: 'on', TERMBIDI_SHAPE: 'off' }).shape, false);
});

test('detect: terminals that reorder by themselves are left alone', () => {
  for (const env of [
    { TERM_PROGRAM: 'iTerm.app', TERM_PROGRAM_VERSION: '3.7.3' },
    { TERM_PROGRAM: 'mintty' },
    { KONSOLE_VERSION: '240802' },
    { VTE_VERSION: '7600' },
  ]) {
    assert.equal(detect(env).mode, 'passthrough', JSON.stringify(env));
  }
});

test('detect: other terminals get reordered and shaped', () => {
  for (const env of [
    { WT_SESSION: 'abc' },
    { TERM_PROGRAM: 'vscode' },
    { TERM_PROGRAM: 'iTerm.app', TERM_PROGRAM_VERSION: '3.6.9' },
    { TERM_PROGRAM: 'WarpTerminal' },
    {},
  ]) {
    const d = detect(env);
    assert.equal(d.mode, 'reorder', JSON.stringify(env));
    assert.equal(d.shape, true);
  }
  assert.equal(detect({ WT_SESSION: 'x' }).terminal, 'Windows Terminal');
});

test('forTerminal passes text through when the terminal handles BiDi', () => {
  assert.equal(forTerminal('שלום', {}, { TERMBIDI: 'off' }), 'שלום');
  assert.equal(forTerminal('שלום', {}, { WT_SESSION: '1' }), 'םולש');
});

test('stream: handles chunks split inside lines and inside UTF-8 sequences', async () => {
  const text = 'שורה ראשונה\nhello\r\n\x1b[32mשורה\x1b[0m שנייה';
  const bytes = Buffer.from(text, 'utf8');
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 3) chunks.push(bytes.subarray(i, i + 3));
  let out = '';
  for await (const part of Readable.from(chunks).pipe(createVisualStream({ shape: false }))) out += part;
  assert.equal(out, toVisual(text, { shape: false }));
});

test('cli: converts piped text', () => {
  const r = spawnSync(process.execPath, [cli, '--force', '--no-shape'], { input: 'שלום עולם\nplain\n', env: { ...process.env, TERMBIDI: '' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.toString(), 'םלוע םולש\nplain\n');
});

test('cli: TERMBIDI=off passes text through', () => {
  const r = spawnSync(process.execPath, [cli], { input: 'שלום\n', env: { ...process.env, TERMBIDI: 'off' } });
  assert.equal(r.stdout.toString(), 'שלום\n');
});

test('cli: rejects bad options with a clear message', () => {
  const r = spawnSync(process.execPath, [cli, '--width', 'abc'], { input: '' });
  assert.equal(r.status, 2);
  assert.match(r.stderr.toString(), /--width must be a positive number/);
  const r2 = spawnSync(process.execPath, [cli, '--nope'], { input: '' });
  assert.equal(r2.status, 2);
  assert.match(r2.stderr.toString(), /unknown option "--nope"/);
});

test('cli: --help and --version', () => {
  const r = spawnSync(process.execPath, [cli, '--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout.toString(), /Usage/);
  const v = spawnSync(process.execPath, [cli, '--version']);
  assert.match(v.stdout.toString(), /^\d+\.\d+\.\d+/);
});

test('cli: --demo prints before and after', () => {
  const r = spawnSync(process.execPath, [cli, '--demo'], { env: { ...process.env, TERMBIDI: 'on' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout.toString(), /Before/);
  assert.match(r.stdout.toString(), /After termbidi/);
});
