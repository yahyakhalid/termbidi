// Throughput benchmark. Run: npm run bench
import { readFileSync } from 'node:fs';
import { toVisual } from '../dist/index.js';

const lines = readFileSync(new URL('../test/fixtures/corpus.txt', import.meta.url), 'utf8').trim().split('\n');
const COLORS = [31, 32, 33, 34, 35, 36];
const colorize = (line) => {
  let k = 0;
  return line.replace(/\S+/g, (w) => `\x1b[${COLORS[k++ % COLORS.length]}m${w}\x1b[0m`);
};

function run(label, input, opts) {
  toVisual(input.slice(0, 2000), opts); // warm up
  const t0 = performance.now();
  toVisual(input, opts);
  const ms = performance.now() - t0;
  const count = input.split('\n').length;
  console.log(`${label.padEnd(34)} ${String(Math.round(count / (ms / 1000))).padStart(8)} lines/s  (${count} lines, ${ms.toFixed(0)} ms)`);
}

const N = 100_000;
const plain = Array.from({ length: N }, (_, i) => lines[i % lines.length]).join('\n');
const colored = Array.from({ length: N }, (_, i) => colorize(lines[i % lines.length])).join('\n');
const ltr = Array.from({ length: N }, () => 'plain English log line with \x1b[32mcolor\x1b[0m and numbers 12345').join('\n');

console.log(`node ${process.version}`);
run('mixed RTL, no colors', plain, {});
run('mixed RTL, every word colored', colored, {});
run('mixed RTL, no shaping', plain, { shape: false });
run('LTR only (fast path)', ltr, {});
