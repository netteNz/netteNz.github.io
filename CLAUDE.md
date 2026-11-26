# nettenzOS Portfolio: Project Context Map

**Project:** macOS-inspired portfolio: desktop shell, Work window, terminal emulator
**Deployment:** GitHub Pages (`https://github.com/netteNz/netteNz.github.io`), no build step
**Stack (index.html):** Vanilla HTML/CSS/JS, GSAP 3.12.5 (CDN), Recursive (Google Fonts), gtag
**Design:** "Signal chain": navy panels, one amber accent, a segmented level meter as the signature element

> PyScript, Prism, ScrollTrigger and the Tailwind CDN were removed from `index.html`.
> `earthquakes_pr.html` still loads Tailwind + PyScript because it actually uses them.

---

## Files

| File | Role |
|---|---|
| `index.html` | Desktop shell: splash, `<noscript>` fallback, menu bar, desktop, dock (`<nav aria-label="Apps">`), `<template>`s for the window frame and each app |
| `earthquakes_pr.html` | Standalone Folium map via PyScript (`projects/earthquake-map/main.py`, `pyscript.toml`). Shares `main.css` tokens |
| `assets/js/projects-data.js` | **Single source of truth for project copy** (`window.PROJECTS`) |
| `assets/js/terminal-engine.js` | Shell emulator. Builds `~/projects/<slug>/README.md` from `PROJECTS` |
| `assets/js/macos.js` | Window manager, dock, menu clock, level meter, splash, Work window renderer |
| `assets/css/main.css` | All tokens and component styles (no Tailwind) |

Script load order is plain `defer`: `gsap`, then `projects-data.js`, then `terminal-engine.js`, then `macos.js`. There is no dependency polling.

## Project data

```js
window.PROJECTS = [{ slug, name, summary, stack: [], live?, repo?, readme: [/* bullets */] }]
```
- Consumers: `macOS.renderWork()` (Work window rows) and `TerminalEngine` (fs, READMEs, shortcuts, help, tab completion).
- **The `<noscript>` list in `index.html` is static and must be updated by hand** when `PROJECTS` changes.
- Security: Work rows are built with `createElement`/`textContent`. The terminal escapes all data with `escapeHtml()`. Links pass `safeUrl()` (http/https only) and use `rel="noopener noreferrer"`. Keep it this way, and never pass data through `innerHTML` unescaped.

## Design tokens (`:root` in main.css)

| Token | Hex | Use |
|---|---|---|
| `--console` | `#101A2C` | page / desktop base, terminal bg |
| `--panel` / `--panel-raised` | `#16233A` / `#1D2C47` | window body / headers, dock |
| `--rule` | `#2A3A57` | hairlines, outlines |
| `--ink` / `--ink-muted` | `#E6EDF7` / `#8EA0BD` | text (muted is 5.9:1 on panel) |
| `--signal` | `#FFB547` | **the one accent**: prompt, focus ring, primary button, links |
| `--meter-safe` / `--meter-peak` | `#4FD18B` / `#FF5D5D` | meter segments only |

- **Type:** Recursive only. Use `--axes-ui` (`MONO 0`) for UI, `--axes-mono` (`MONO 1`) for the terminal and code only, and `--axes-heading` (`CASL 0.5`) for headings. Sizes come from the `--fs-12/14/16/20/28/40` scale, with 1.5 leading.
- **Radius by hierarchy:** windows `--radius-window` 10px, buttons `--radius-control` 6px, tags `--radius-tag` 4px.
- `--terminal-*` are aliases for the terminal markup. The old `--md-*` tokens are gone.
- **Components:** `.level-meter` (8 `<span>`s, `.is-lit`), `.btn .btn-primary/.btn-secondary`, `.tag`/`.tag-row`, `.work-list`/`.work-row`, `:focus-visible` (2px amber ring).

**Copy and style rules:**
- Sentence case everywhere; no all-caps labels.
- No `·`-joined meta strings and no `→` on links.
- No 01/02 numbering, no gradient washes, no identical card grids.
- No single-word accent in headlines.
- No mono for small UI labels.
- CTAs say exactly what they do.

## Window manager (`macos.js`)

- Apps: `welcome`, `about`, `projects` (titled "Work"; `?open=work` and `?open=projects` both deep-link), `terminal`, `contact`. Default sizes are in `APP_SIZES`, clamped to the viewport.
- **Dragging:** Pointer Events with `setPointerCapture`, disabled at ≤768px and when maximized.
- **Minimize:** hides the window (`.minimized`). The dock dot stays, and a dock click restores it. Reopening an open app only focuses it.
- **Keyboard:** Esc closes the active window, except when focus is in `.terminal-input`, and returns focus to its dock button.
- **Meter:** `bumpMeter(level)` lights the meter when a window opens, on terminal keystrokes, and on link hover. It decays back to rest and is a no-op under reduced motion or `.software-rendering`.
- **Splash:** about 1.2s. It is skipped on deep links, under reduced motion, and once `sessionStorage.seenSplash` is set.
- **GSAP** is used only for window open, close, minimize-restore and maximize, and is skipped when `motionOK()` is false.

## Terminal (`terminal-engine.js`)

- **Commands:** `help ls cd pwd cat readme projects|work whoami neofetch matrix clear exit`. Simple `a && b` chaining works.
- **Paths:** `cd`, `ls` and `cat` resolve relative paths, `..` and `~/...`.
- **Project shortcuts:** each slug, plus the aliases in `PROJECT_ALIASES`, opens `live || repo` in a new tab.
- **Input:** queried by `.terminal-input` (there is no `#terminal-input` ID).

## Mobile (≤768px)

- Windows become full-screen sheets (`inset: 32px 0 64px 0`) with no drag and no maximize.
- The dock becomes a full-width tab bar with labels.
- Desktop icons, menu items and the clock are hidden.

## Run

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## TODO

- `assets/og.png` (1200x630) is referenced by `og:image`/`twitter:image` but not generated yet.
- `TODO(copy)` on the earthquake entry in `projects-data.js`: confirm the repo URL.
