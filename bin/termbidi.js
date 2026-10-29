#!/usr/bin/env node
import { createRequire } from 'node:module';
import { createVisualStream, detect, toVisual } from '../dist/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const HELP = `termbidi ${version}
Show Arabic, Hebrew, Persian and Urdu correctly in terminals that don't
support right-to-left text, keeping colors and column widths.

Usage
  some-command | termbidi [options]
  termbidi --demo

Options
  -w, --width <n|auto>   Wrap lines to n columns before reordering
                         ("auto" uses the terminal width)
  -d, --dir <auto|ltr|rtl>
                         Base direction of each line (default: auto)
  -r, --align-rtl        With --width, right-align right-to-left lines
      --no-shape         Do not join Arabic letters (for terminals that
                         already shape Arabic)
      --ligatures        Join lam + alef into one cell (changes widths)
  -f, --force            Reorder even if the terminal seems to do it itself
      --detect           Print what termbidi detected about this terminal
      --demo             Print sample lines before and after
  -h, --help             Show this help
  -v, --version          Show the version

Environment
  TERMBIDI=off           Pass text through unchanged
  TERMBIDI=on            Always reorder
  TERMBIDI_SHAPE=off     Never join Arabic letters

Tip: many tools turn colors off when piped. Ask for them, for example
  git -c color.ui=always log | termbidi
  FORCE_COLOR=1 npm test | termbidi
`;

function fail(message) {
  process.stderr.write(`termbidi: ${message}\nRun "termbidi --help" for usage.\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const opts = { width: undefined, dir: 'auto', alignRtl: false, shape: undefined, ligatures: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [name, inline] = arg.startsWith('--') && arg.includes('=') ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const value = () => {
      if (inline !== undefined) return inline;
      const v = argv[++i];
      if (v === undefined) fail(`${name} needs a value`);
      return v;
    };
    switch (name) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '-v':
      case '--version':
        opts.version = true;
        break;
      case '-w':
      case '--width': {
        const v = value();
        if (v === 'auto') opts.width = 'auto';
        else if (/^\d+$/.test(v) && Number(v) > 0) opts.width = Number(v);
        else fail(`--width must be a positive number or "auto", got "${v}"`);
        break;
      }
      case '-d':
      case '--dir': {
        const v = value();
        if (!['auto', 'ltr', 'rtl'].includes(v)) fail(`--dir must be auto, ltr or rtl, got "${v}"`);
        opts.dir = v;
        break;
      }
      case '-r':
      case '--align-rtl':
        opts.alignRtl = true;
        break;
      case '--no-shape':
        opts.shape = false;
        break;
      case '--ligatures':
        opts.ligatures = true;
        break;
      case '-f':
      case '--force':
        opts.force = true;
        break;
      case '--detect':
        opts.detect = true;
        break;
      case '--demo':
        opts.demo = true;
        break;
      default:
        fail(`unknown option "${arg}"`);
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (opts.version) {
  process.stdout.write(`${version}\n`);
  process.exit(0);
}

const detection = detect();
if (opts.detect) {
  process.stdout.write(`${JSON.stringify(detection, null, 2)}\n`);
  process.exit(0);
}

const width = opts.width === 'auto' ? process.stdout.columns || 80 : opts.width;
if (opts.alignRtl && !width) fail('--align-rtl needs --width');
const visualOpts = {
  direction: opts.dir,
  shape: opts.shape ?? detection.shape,
  ligatures: opts.ligatures,
  width,
  alignRtl: opts.alignRtl,
};
const reorder = opts.force || detection.mode === 'reorder';

if (opts.demo) {
  const { DEMO_LINES } = await import('./demo-lines.js');
  const before = DEMO_LINES.join('\n');
  const after = reorder ? toVisual(before, visualOpts) : before;
  process.stdout.write(`\x1b[2mBefore (as the program printed it):\x1b[0m\n${before}\n\n`);
  process.stdout.write(`\x1b[2mAfter termbidi (${detection.terminal}, ${reorder ? 'reordered' : 'left as is: ' + detection.reason}):\x1b[0m\n${after}\n`);
  process.exit(0);
}

if (process.stdin.isTTY) {
  process.stderr.write('termbidi reads text from a pipe, for example:\n  cat notes.txt | termbidi\n  termbidi --demo\n');
  process.exit(2);
}

process.stdout.on('error', (err) => {
  // The reader went away (e.g. `| head`): stop quietly.
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

if (!reorder) {
  process.stdin.pipe(process.stdout);
} else {
  process.stdin.pipe(createVisualStream(visualOpts)).pipe(process.stdout);
}
