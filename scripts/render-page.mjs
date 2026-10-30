// Builds an HTML page that renders DEMO_LINES in two real xterm.js terminals:
// the raw output on the left, termbidi's output on the right. xterm.js is the
// terminal engine used by VS Code. Usage:
//   node scripts/render-page.mjs <dir-with-node_modules/@xterm/xterm> <out.html> [--no-shape]
import { writeFileSync } from 'node:fs';
import { toVisual } from '../dist/index.js';
import { DEMO_LINES } from '../bin/demo-lines.js';

const [, , xtermDir = '.', out = 'render.html', flag] = process.argv;
const before = DEMO_LINES.join('\r\n');
const after = toVisual(DEMO_LINES.join('\n'), { shape: flag !== '--no-shape' }).split('\n').join('\r\n');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>termbidi render test</title>
<link rel="stylesheet" href="${xtermDir}/node_modules/@xterm/xterm/css/xterm.css">
<style>
  body{margin:0;background:#0d1117;color:#e6edf3;font:14px system-ui;padding:16px}
  .wrap{display:flex;gap:16px}
  .pane{flex:1;min-width:0}
  h2{font:600 14px system-ui;margin:0 0 8px;color:#8b949e}
  .term{border:1px solid #30363d;border-radius:8px;padding:8px;background:#010409}
</style></head>
<body>
<div class="wrap">
  <div class="pane" id="p1"><h2>Before: raw output</h2><div class="term" id="before"></div></div>
  <div class="pane" id="p2"><h2>After: piped through termbidi</h2><div class="term" id="after"></div></div>
</div>
<script src="${xtermDir}/node_modules/@xterm/xterm/lib/xterm.js"></script>
<script src="${xtermDir}/node_modules/@xterm/addon-webgl/lib/addon-webgl.js"></script>
<script>
const q = new URLSearchParams(location.search);
// ?font=<url of a .woff2/.ttf>&family=<name> renders with a monospace font whose
// Arabic presentation forms fill the cell, so joined letters touch.
const family = q.get('family');
const opts = {cols: Number(q.get('cols') || 60), rows: ${DEMO_LINES.length + 1}, fontSize: Number(q.get('size') || 16), fontFamily: (family ? '"' + family + '", ' : '') + 'Cascadia Mono, Consolas, monospace', theme:{background:'#010409'}};
// The WebGL renderer draws every cell on its own, like VS Code's default
// (terminal.integrated.gpuAcceleration = auto). The DOM renderer would let the
// browser lay out each row, which is not what VS Code users see by default.
const renderer = q.get('renderer') || 'webgl';
function make(id, data) {
  const t = new Terminal(opts);
  t.open(document.getElementById(id));
  if (renderer === 'webgl') t.loadAddon(new WebglAddon.WebglAddon());
  t.write(data);
  return t;
}
(async () => {
  if (family && q.get('font')) {
    const face = new FontFace(family, 'url(' + q.get('font') + ')');
    document.fonts.add(await face.load());
  }
  make('before', ${JSON.stringify(before)});
  make('after', ${JSON.stringify(after)});
  document.title = 'termbidi render test (' + renderer + ')';
  window.__ready = true;
})();
</script></body></html>`;
writeFileSync(out, html);
console.log(out);
