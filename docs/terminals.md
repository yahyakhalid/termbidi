# Terminal support

termbidi only helps in terminals that **do not** apply the Unicode
Bidirectional Algorithm themselves. In terminals that do, reordering again
would flip the text back, so `detect()` and the CLI leave the text alone.

How each terminal is recognised, and how sure we are:

| Terminal | Reorders RTL itself? | termbidi default | Recognised by | Status |
|---|---|---|---|---|
| VS Code integrated terminal (xterm.js, GPU renderer) | No | reorder + shape | `TERM_PROGRAM=vscode` | **Verified** with xterm.js 6.0 + WebGL renderer (`docs/images/xterm-before-after.png`) |
| Windows Terminal | No ([microsoft/terminal#538](https://github.com/microsoft/terminal/issues/538)) | reorder + shape | `WT_SESSION` | Reordering follows from #538; shaped output **not yet checked on screen** |
| Warp | No ([anthropics/claude-code#89489](https://github.com/anthropics/claude-code/issues/89489)) | reorder + shape | `TERM_PROGRAM=WarpTerminal` | From user reports |
| Ghostty | No ([discussion #9774](https://github.com/ghostty-org/ghostty/discussions/9774)) | reorder + shape | `TERM_PROGRAM=ghostty` | From the project's discussion |
| kitty, Alacritty, WezTerm, JetBrains | Not by default | reorder + shape | their env variables | Needs confirmation |
| iTerm2 ≥ 3.7 | **Yes** (RTL on by default) | pass through | `TERM_PROGRAM=iTerm.app` + version | From [anthropics/claude-code#99046](https://github.com/anthropics/claude-code/issues/99046) |
| iTerm2 < 3.7 | No | reorder + shape | same, older version | Needs confirmation |
| mintty, Konsole, mlterm, VTE ≥ 0.58 (GNOME Terminal, Tilix) | **Yes** | pass through | `TERM_PROGRAM=mintty`, `KONSOLE_VERSION`, `MLTERM`, `VTE_VERSION` | From the terminals' documentation; needs confirmation |
| Apple Terminal | Reported to | pass through | `TERM_PROGRAM=Apple_Terminal` | **Unverified**, please report |
| tmux / screen inside iTerm2 ≥ 3.7 | **Yes** (the outer terminal reorders) | pass through | `TERM_PROGRAM=tmux` + `LC_TERMINAL=iTerm2` | Follows from the iTerm2 entry |
| tmux / screen elsewhere | No | reorder + shape | `TERM_PROGRAM=tmux` | Depends on the outer terminal |
| Anything else | Assumed no | reorder + shape | — | Most terminals do not implement BiDi |

`TERM_PROGRAM` is checked before variables such as `VTE_VERSION`, `KONSOLE_VERSION` and
`WT_SESSION`, because programs started from a terminal inherit those (VS Code opened
with `code .` from GNOME Terminal still has `VTE_VERSION`).

If the guess is wrong for your setup, override it:

```bash
export TERMBIDI=off        # never touch text
export TERMBIDI=on         # always reorder
export TERMBIDI_SHAPE=off  # reorder, but don't join Arabic letters
```

## Known pitfalls

- **VS Code with GPU acceleration turned off** (`"terminal.integrated.gpuAcceleration": "off"`):
  the DOM renderer lets the browser lay out each row, so raw RTL text already
  appears in the right order (with misplaced cells) and termbidi's output may
  appear flipped. Set `TERMBIDI=off` there.
- **Terminals that answer DECRQM for the BiDi mode (BDSM, mode 8)** can be
  asked directly with `queryTerminal()`. If it returns `implicit`, the
  terminal reorders by itself; an app can send `DISABLE_TERMINAL_BIDI`
  (`CSI 8 l`), reorder with termbidi, and send `ENABLE_TERMINAL_BIDI` on exit.
  This is the approach proposed in anthropics/claude-code#99046; it is not
  done automatically by the CLI.
- **Fonts:** joined Arabic forms are drawn from your terminal font or its
  fallback. Fonts without Arabic presentation forms show gaps between
  letters or boxes. Cascadia Code/Mono, DejaVu Sans Mono and Noto Sans Mono
  have them.

## Help us fill this table

Run this in your terminal and open an issue with the output and a
screenshot:

```bash
npx github:yahyakhalid/termbidi --detect
npx github:yahyakhalid/termbidi --demo
```
