# Verification and benchmarks

Everything below can be re-run from a clone. Results were recorded on
2026-10-29 on Windows 11 with Node v26.12.1.

## 1. Unicode conformance

termbidi takes embedding levels from [`bidi-js`](https://github.com/lojjic/bidi-js)
and does line reordering (rules L1–L2), bracket mirroring (L4), grapheme
handling and ANSI re-emission itself. To check that part against the
standard we run the official test file:

```bash
curl -LO https://www.unicode.org/Public/UCD/latest/ucd/BidiCharacterTest.txt
npm run build
node scripts/conformance.mjs BidiCharacterTest.txt
```

| File | Cases checked | Passed | Skipped |
|---|---|---|---|
| BidiCharacterTest-18.0.0 | 91,690 | **91,690 (100%)** | 17 |

Skipped cases contain control characters (tabs, paragraph separators) or
multi-code-point graphemes, which termbidi handles differently on purpose:
it expands tabs and keeps combining marks after their base letter.
Mirrored brackets are compared as the same character because the reference
lists positions, not glyphs. Raw output: [`experiment/conformance.json`](experiment/conformance.json).

## 2. Comparison with a plain BiDi tool

`scripts/experiment.mjs` runs a 57-line corpus ([`test/fixtures/corpus.txt`](../test/fixtures/corpus.txt):
Arabic, Hebrew, Persian, Urdu and Kurdish mixed with English, numbers,
paths, URLs, brackets, emoji and diacritics) through termbidi and through
[`python-bidi`](https://pypi.org/project/python-bidi/) 0.6.12 (Rust
`unicode-bidi`), an independent implementation.

```bash
pip install python-bidi
npm run build
node scripts/experiment.mjs python
```

| Check | termbidi | python-bidi |
|---|---|---|
| Visual order, plain text (55 RTL lines) | 45 identical, 10 differ only where termbidi mirrors brackets and keeps marks after their letter; 0 other differences | reference |
| Every word in its own ANSI color: each character keeps its color | **57 / 57** lines | escape codes intact in **1 / 55** RTL lines |
| Column width unchanged | 57 / 57 | — |
| Lines without RTL text left byte-for-byte unchanged | yes | — |

Raw output: [`experiment/results.json`](experiment/results.json).

## 3. Rendering

`scripts/render-page.mjs` writes the same colored lines into two real
xterm.js 6.0 terminals with the WebGL renderer (the GPU renderer used by
VS Code), raw on the left and through termbidi on the right.

![xterm.js before and after](images/xterm-before-after.png)

Without letter shaping the order is right, but the renderer joins
neighbouring cells as if the text ran left to right, so words take the
wrong shapes. That is why shaping is on by default:

![xterm.js without shaping](images/xterm-no-shaping.png)

## 4. Throughput

```bash
npm run bench
```

| Input (100,000 lines) | Lines per second |
|---|---|
| Mixed RTL, no colors | ~73,000 |
| Mixed RTL, every word colored | ~29,000 |
| Mixed RTL, shaping off | ~87,000 |
| English only (unchanged, fast path) | ~970,000 |

Numbers depend on the machine; they are here to show the order of
magnitude, not as a promise.

## What is not verified yet

- On-screen rendering in Windows Terminal, iTerm2, Konsole, mintty and
  Apple Terminal. See [terminals.md](terminals.md).
- Behaviour with every font. Arabic presentation forms come from the
  terminal font or its fallback.
