# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Until 1.0, minor versions may
change the API.

## [Unreleased]

### Changed
- Screenshots and banners rendered with Vazir Code, a monospace font whose Arabic forms fill the cell; README section on fonts. `scripts/render-page.mjs` accepts `?font=` and `&family=`.

## [0.1.0] - 2026-10-29

First public, experimental release.

### Added
- `toVisual()` and `lineToVisual()`: logical-to-visual reordering with the
  Unicode Bidirectional Algorithm (levels from `bidi-js`, line reordering,
  bracket mirroring), keeping ANSI SGR styles and OSC 8 hyperlinks on every
  character and the column width of every line.
- Arabic-script shaping into presentation forms for Arabic, Persian, Urdu and
  the Kurdish letters that have them, with an optional lam-alef ligature.
- Wrapping to a column width before reordering, and optional right alignment
  of RTL lines.
- `createVisualStream()` Transform stream.
- `detect()`, `forTerminal()` and `queryTerminal()` (DECRQM for BDSM, mode 8),
  plus `DISABLE_TERMINAL_BIDI` / `ENABLE_TERMINAL_BIDI`.
- `termbidi` CLI with `--width`, `--align-rtl`, `--dir`, `--no-shape`,
  `--ligatures`, `--force`, `--detect` and `--demo`.
- Strict escape-sequence parsing: malformed CSI/OSC sequences and C0/C1
  controls make a line pass through unchanged. In converted lines the only
  sequences written are SGR rebuilt from known parameters, the input's own
  OSC 8 links, erase-in-line and the ASCII charset designation.
- Verification scripts: Unicode `BidiCharacterTest` conformance, comparison
  with python-bidi, xterm.js rendering, throughput benchmark.

[0.1.0]: https://github.com/yahyakhalid/termbidi/releases/tag/v0.1.0
