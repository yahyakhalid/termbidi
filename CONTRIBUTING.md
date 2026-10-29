# Contributing to termbidi

Thanks for helping. Arabic, English, Hebrew and Persian are all welcome in
issues and pull requests.

## The most useful contribution: a terminal report

termbidi has to know which terminals reorder RTL text themselves. Only some
were checked on screen (see [docs/terminals.md](docs/terminals.md)). If you
use a terminal that is missing or marked unverified:

1. Run:
   ```bash
   npx github:yahyakhalid/termbidi --detect
   npx github:yahyakhalid/termbidi --demo
   ```
2. Open a **Terminal report** issue with the output, a screenshot, your OS,
   terminal name and version, and font.

## Development

```bash
git clone https://github.com/yahyakhalid/termbidi
cd termbidi
npm install
npm test          # builds and runs the test suite
npm run bench     # throughput
npm run demo      # before/after in your terminal
```

Source is in `src/` (TypeScript, compiled to `dist/`), the CLI in `bin/`, tests
in `test/` (Node's built-in test runner).

To check reordering against the Unicode standard:

```bash
curl -LO https://www.unicode.org/Public/UCD/latest/ucd/BidiCharacterTest.txt
node scripts/conformance.mjs BidiCharacterTest.txt
```

## Pull requests

- Keep each pull request to one change, with a test that fails without it.
- Run `npm test` before pushing. CI runs it on Linux, macOS and Windows.
- Lines without RTL text must keep passing through unchanged; that guarantee
  is what makes it safe to put termbidi in front of any output.
- New shaping data: cite the Unicode code points (ArabicShaping.txt and the
  presentation forms blocks).
- Update `CHANGELOG.md` under an "Unreleased" heading.

## Conduct

Be kind and assume good faith. Harassment or discrimination of any kind is
not accepted; maintainers may remove comments or block accounts that
break this.
