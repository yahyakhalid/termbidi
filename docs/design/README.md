# Banner source

`banner.html` builds `docs/images/banner.png` and `social-preview.png` (English README); `banner-ar.html` builds `docs/images/banner-ar.png` (Arabic README). `before.png` and `after.png` are crops of the real xterm.js render in `docs/images/xterm-before-after.png` (made with `scripts/render-page.mjs`).

Serve this folder over HTTP and screenshot it at 1280x640:

```bash
python -m http.server 8000
# then, for example:
chrome --headless=new --window-size=1280,640 --force-device-scale-factor=2 --screenshot=banner.png http://localhost:8000/banner.html
```

The terminal screenshots use Vazir Code (public domain): `node scripts/render-page.mjs <xterm dir> render.html`, then open `render.html?font=vazir.woff2&family=vazir&size=23&cols=48`.
