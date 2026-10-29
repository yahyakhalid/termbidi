# Examples

Run these from the repository root after `npm install` (which also builds
`dist/`).

| File | What it shows | Command |
|---|---|---|
| `sample.txt` | Plain RTL text in five languages | `node bin/termbidi.js < examples/sample.txt` |
| `basic.mjs` | `toVisual()`, `forTerminal()` and `detect()` on colored output | `node examples/basic.mjs` |
| `wrap-child-process.mjs` | Run any command and stream its output through termbidi, keeping colors | `node examples/wrap-child-process.mjs git -c color.ui=always log --oneline -5` |

On Windows PowerShell, use `Get-Content examples/sample.txt -Encoding utf8 | node bin/termbidi.js`
or `cmd /c "node bin\termbidi.js < examples\sample.txt"`.
