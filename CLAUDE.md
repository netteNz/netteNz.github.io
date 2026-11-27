# nettenzOS Portfolio: Project Context Map

**Project:** macOS-inspired portfolio: desktop shell, Work window, terminal emulator
**Deployment:** GitHub Pages (`https://github.com/netteNz/netteNz.github.io`), no build step
**Stack (index.html):** Vanilla HTML/CSS/JS, GSAP 3.12.5 (CDN), Recursive (Google Fonts), gtag
**Design:** dark minimal shell (GitHub Dark neutrals, mauve used sparingly) + a vibrant Catppuccin Mocha terminal. The segmented level meter is the signature element

> PyScript, Prism, ScrollTrigger and the Tailwind CDN were removed from `index.html`.
> `earthquakes_pr.html` still loads Tailwind + PyScript because it actually uses them.

---

## Files

| File | Role |
|---|---|
| `index.html` | Desktop shell: splash, `<noscript>` fallback, menu bar, desktop, dock (`<nav aria-label="Apps">`), `<template>`s for the window frame and each app |
| `earthquakes_pr.html` | Standalone Folium map via PyScript (`projects/earthquake-map/main.py`, `pyscript.toml`). Shares `main.css` tokens |
| `assets/js/projects-data.js` | **Single source of truth for project copy** (`window.PROJECTS`) |
| `assets/js/readme-viewer.js` | `window.ReadmeViewer.load(project)`: fetches, sanitizes and URL-rewrites a project's GitHub README |
| `assets/js/terminal-engine.js` | Shell emulator. Builds `~/projects/<slug>/README.md` from `PROJECTS` |
| `assets/js/macos.js` | Window manager, dock, menu clock, level meter, splash, Work window renderer |
| `assets/css/main.css` | All tokens and component styles (no Tailwind) |

Script load order is plain `defer`: `gsap`, `dompurify`, `projects-data.js`, `terminal-engine.js`, `readme-viewer.js`, then `macos.js`. There is no dependency polling.

## Project data

```js
window.PROJECTS = [{ slug, name, summary, stack: [], live?, repo?, readme: [/* bullets */] }]
```
- Consumers: `macOS.renderWork()` (Work window rows) and `TerminalEngine` (fs, READMEs, shortcuts, help, tab completion).
- **The `<noscript>` list in `index.html` is static and must be updated by hand** when `PROJECTS` changes.
- Security: Work rows are built with `createElement`/`textContent`. The terminal escapes all data with `escapeHtml()`. Links pass `safeUrl()` (http/https only) and use `rel="noopener noreferrer"`. Keep it this way, and never pass data through `innerHTML` unescaped.

## README viewer

- **Window:** app `readme` is a single reused window (760x640, mobile sheet at ≤768px). `macOS.openReadme(slug)` opens or focuses it, sets the title to `<slug>/README.md`, and renders loading, success or failure. A request counter drops stale results (open A, then B: only B renders). It is opened from the Work "README" button, a click on a project directory in `ls`, and `cat README.md` in a project directory. It has no dock item.
- **Fetch:** `GET api.github.com/repos/<owner>/<repo>/readme` with `Accept: application/vnd.github.html+json` (CORS open, no token). Only `https://github.com/<owner>/<repo>` URLs are accepted.
- **Cache:** raw HTML in `sessionStorage['readme:<owner>/<repo>']`. It is sanitized again on every render, so the cache is never trusted.
- **Rate limit:** 60 requests per hour per visitor IP. On 403/429, 404 or a network error, the window shows a short message plus the project's `summary` and `readme` bullets, and always a "View on GitHub" link.
- **Sanitizing:** DOMPurify **3.5.0** (`dist/purify.min.js`, jsDelivr, pinned, `integrity="sha384-DOUwTXbuiiQxlONuue5N42674XXDfjIJ/LTPtJMZ2ZV1Ir4NRQ3OnM/yM505YQAc"`, `crossorigin="anonymous"`). It is a dependency because we insert third-party HTML. If it fails to load, nothing is inserted and the fallback shows. To upgrade, change the version in `index.html` and recompute: `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
- **After sanitizing:** relative `img` become `raw.githubusercontent.com/<owner>/<repo>/HEAD/...`, relative links become `github.com/<owner>/<repo>/blob/HEAD/...`, external links get `target="_blank" rel="noopener noreferrer"`, `a.anchor` permalinks are removed (their ids move onto the headings), images are `loading="lazy"`, and tables are wrapped for horizontal scroll. `#x` links scroll the window to `#user-content-x` and never change the page URL.
- **Styles:** `.readme-body` in `main.css`, built from existing tokens only. Insert fetched HTML only as the sanitized fragment; everything else uses `textContent`.

## Design tokens (`:root` in main.css)

| Token | Hex | Use |
|---|---|---|
**Shell (dark minimal, GitHub Dark neutrals)**

| Token | Hex | Use |
|---|---|---|
| `--console` | `#0d1117` | page / desktop base, terminal bg |
| `--panel` / `--panel-raised` | `#161b22` / `#1c2128` | window body / headers, dock |
| `--rule` | `#30363d` | hairlines, outlines |
| `--ink` / `--ink-muted` | `#e6edf3` / `#8b949e` | text (muted is 5.6:1 on panel); `--ink` is also the primary-button fill |
| `--accent` | `#cba6f7` | Catppuccin mauve, **sparingly**: focus ring, link hover, selection. Never as a fill or a heading colour |
| `--meter-safe/-mid/-peak` | `#a6e3a1` / `#f9e2af` / `#f38ba8` | meter segments only |

**Terminal (Catppuccin Mocha on the GitHub base):** the `--ctp-*` tokens are used only inside `.terminal-content`.
- Prompt and `.t-ok`: green. Path, directories and `.t-accent` labels: blue. Headings (`.t-accent.t-strong`): mauve.
- Links: sapphire. Errors (`.t-error`): red. Muted text: subtext0. Caret: rosewater.
- Every pair is ≥ 8:1 on `#0d1117`.

- **Type:** Recursive only. Use `--axes-ui` (`MONO 0`) for UI, `--axes-mono` (`MONO 1`) for the terminal and code only, and `--axes-heading` (`CASL 0.5`) for headings. Sizes come from the `--fs-12/14/16/20/28/40` scale, with 1.5 leading.
- **Radius by hierarchy:** windows `--radius-window` 10px, buttons `--radius-control` 6px, tags `--radius-tag` 4px.
- `--terminal-*` are aliases for the terminal markup. The old `--md-*` tokens are gone.
- **Components:** `.level-meter` (8 `<span>`s, `.is-lit`), `.btn .btn-primary/.btn-secondary`, `.tag`/`.tag-row`, `.work-list`/`.work-row`, `:focus-visible` (2px mauve ring).

**Copy and style rules:**
- Sentence case everywhere; no all-caps labels.
- No `·`-joined meta strings and no `→` on links.
- No 01/02 numbering, no gradient washes, no identical card grids.
- No single-word accent in headlines.
- No mono for small UI labels.
- CTAs say exactly what they do.

## Window manager (`macos.js`)

- Apps: `welcome`, `about`, `projects` (titled "Work"; `?open=work` and `?open=projects` both deep-link), `terminal`, `contact`, `readme`. Default sizes are in `APP_SIZES`, clamped to the viewport.
- **Dragging:** Pointer Events with `setPointerCapture`, disabled at ≤768px and when maximized.
- **Resizing:** `makeResizable()` injects 8 `.window-resize` edge/corner handles (4px outside the border, so `.window` has no `overflow: hidden`; header/content round their own corners via `--window-inner-radius`). Min `MIN_WINDOW` 360x220, clamped to the viewport below the menu bar, disabled at ≤768px and when maximized.
- **Minimize:** hides the window (`.minimized`). The dock dot stays, and a dock click restores it. Reopening an open app only focuses it.
- **Keyboard:** Esc closes the active window, except when focus is in `.terminal-input`, and returns focus to its dock button.
- **Meter:** `bumpMeter(level)` lights the meter when a window opens, on terminal keystrokes, and on link hover. It decays back to rest and is a no-op under reduced motion or `.software-rendering`.
- **Splash:** about 1.4s (meter + boot log, exit at 1.1s, 0.3s fade). It is skipped on deep links, under reduced motion, and once `sessionStorage.seenSplash` is set.
- **GSAP** is used only for window open, close, minimize-restore and maximize, and is skipped when `motionOK()` is false.

## Terminal (`terminal-engine.js`)

- **Commands:** `help ls cd pwd cat readme projects|work whoami neofetch matrix clear exit`. Simple `a && b` chaining works.
- **Paths:** `cd`, `ls` and `cat` resolve relative paths, `..` and `~/...`.
- **Project shortcuts:** each slug, plus the aliases in `PROJECT_ALIASES`, opens `live || repo` in a new tab. `window.open` is called synchronously (no `setTimeout`) so Safari's popup blocker allows it.
- **README:** clicking a project directory in `ls` runs `cd` then `openReadme(slug)`. `cat README.md` in a project prints the short summary, then "Opening README…" and opens the window.
- **Input:** queried by `.terminal-input` (there is no `#terminal-input` ID).

## Mobile (≤768px)

- Windows become full-screen sheets (`inset: 32px 0 64px 0`) with no drag and no maximize.
- The dock becomes a full-width tab bar with labels.
- Desktop icons, menu items and the clock are hidden.

## Run

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Social preview

`assets/og.png` (1200x630, used by `og:image`/`twitter:image`) is a headless-Chrome render of a static card: `--console` background, the 24-segment meter, name, title, and a Catppuccin prompt line. Regenerate it whenever the name or job title changes:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot=assets/og.png file:///path/to/og.html
```

## TODO

- `earthquakes_pr.html`: the CARTO dark tiles now need an API key, and `get_circle_color` in `main.py` has a 4.0–4.5 gap (rendered red) that doesn't match the legend.
- `README.md` is out of date.