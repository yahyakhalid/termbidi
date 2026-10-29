// Run any command and show its output through termbidi, keeping colors.
//   node examples/wrap-child-process.mjs git log --oneline -5
//
// FORCE_COLOR asks Node-based tools to keep their colors even though their
// output goes to a pipe; git needs `-c color.ui=always` instead.
import { spawn } from 'node:child_process';
import { createVisualStream, detect } from '../dist/index.js';

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: node examples/wrap-child-process.mjs <command> [args...]');
  process.exit(2);
}

const child = spawn(cmd, args, {
  env: { ...process.env, FORCE_COLOR: '1' },
  stdio: ['inherit', 'pipe', 'pipe'],
});
child.on('error', (err) => {
  // On Windows, .cmd wrappers such as npm need their full name: npm.cmd
  console.error(`could not start "${cmd}": ${err.message}`);
  process.exit(127);
});

const d = detect();
const out = d.mode === 'reorder' ? child.stdout.pipe(createVisualStream({ shape: d.shape })) : child.stdout;
const err = d.mode === 'reorder' ? child.stderr.pipe(createVisualStream({ shape: d.shape })) : child.stderr;
out.pipe(process.stdout);
err.pipe(process.stderr);
child.on('close', (code) => process.exit(code ?? 1));
