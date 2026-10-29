// Run from the repository root after `npm install`:
//   node examples/basic.mjs
//
// Prints a few colored RTL lines the way a CLI tool would, once as-is and
// once through termbidi.
import { toVisual, forTerminal, detect } from '../dist/index.js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const output = [
  `${green('✓')} تم تثبيت ${bold('42')} حزمة في 3.5 ثانية`,
  `${red('✗ خطأ:')} الملف config.json غير موجود`,
  `${green('✓')} הבדיקות עברו (${bold('12')} מתוך 12)`,
  'گزارش کامل در پوشه‌ی reports/ ذخیره شد',
].join('\n');

console.log('As printed:\n' + output + '\n');

// Always convert:
console.log('toVisual():\n' + toVisual(output) + '\n');

// Convert only if this terminal needs it:
const d = detect();
console.log(`forTerminal() (${d.terminal}: ${d.reason}):\n` + forTerminal(output));
