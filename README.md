# nettenzOS

The portfolio of Emanuel Lugo Rivera, AI software development engineer, built as a small desktop OS in the browser. It has draggable windows, a dock, a working terminal, and a Work window that renders each project's real GitHub README.

Live at **https://nettenz.github.io/**

## What's on the site

- **Work window:** every project with its stack, a link to the live demo or repo, and a README button.
- **README window:** fetches the project's README from GitHub and renders it in place, with images and tables.
- **Terminal:** a shell over a small virtual filesystem. Browse projects with `ls` and `cd`, then read their READMEs.
- **About and Contact windows**, plus a downloadable resume.
- **Mobile layout:** under 768px, windows become full-screen sheets and the dock becomes a tab bar.

## Stack

| Area | What's used |
|---|---|
| Site | Vanilla HTML, CSS and JS. No build step, no framework. |
| Animation | GSAP 3.12.5 (CDN), for window transitions only |
| Type | Recursive (variable font: sans for the UI, mono for the terminal) |
| README rendering | GitHub REST API (`application/vnd.github.html+json`), sanitized with DOMPurify 3.5.0, pinned with SRI |
| Earthquake map | PyScript 2025.3.1 with folium and pandas, Esri World Dark Gray tiles |
| Hosting | GitHub Pages, deployed from `main` |

**Theme:** a dark minimal shell on GitHub Dark neutrals, a Catppuccin Mocha terminal, and a segmented level meter as the signature element. The tokens live in `:root` in `assets/css/main.css`.

## Run locally

```bash
git clone https://github.com/netteNz/netteNz.github.io.git
cd netteNz.github.io
python3 -m http.server 8000   # http://localhost:8000
```

Useful deep links: `?open=work`, `?open=about`, `?open=terminal`, `?open=contact`. Deep links skip the boot splash.

## Key files

| File | Role |
|---|---|
| `assets/js/projects-data.js` | **Single source of truth for project copy.** It feeds the Work window and the terminal. |
| `assets/js/macos.js` | Window manager, dock, menu bar, splash, Work window, README window |
| `assets/js/terminal-engine.js` | Shell emulator: commands, virtual filesystem, project shortcuts |
| `assets/js/readme-viewer.js` | Fetches, sanitizes and rewrites GitHub README HTML, with a session cache |
| `assets/css/main.css` | All design tokens and component styles |
| `earthquakes_pr.html` + `projects/earthquake-map/main.py` | Standalone Puerto Rico earthquake map |
| `CLAUDE.md` | Detailed architecture notes for working on the code |

**Adding a project:** add an entry to `PROJECTS` in `projects-data.js`, then mirror it in the `<noscript>` list in `index.html`, which is static HTML kept in sync by hand.

## Terminal commands

| Command | What it does |
|---|---|
| `help` | List commands and project shortcuts |
| `ls [dir]` | List a directory. Click a project to open it and its README. |
| `cd <dir>` | Change directory (`..` and `~/…` work) |
| `pwd` | Print the current directory |
| `cat <file>` | Print a file. `cat README.md` in a project also opens the README window. |
| `readme` | Show the current project's README summary |
| `projects` / `work` | Open the Work window |
| `whoami` | Who I am |
| `neofetch` | System info |
| `matrix` | Enter the matrix (any key or click exits) |
| `clear` | Clear the terminal |
| `exit` | Close the terminal |

Commands can be chained with `&&`, for example `cd projects/oled-bonnet && cat README.md`.

**Project shortcuts:** type a project's name to open its live demo or repo in a new tab. Each project's folder name works, and so do these shorter aliases: `oled`, `macropad`, `rl-trading`, `web-audio`, `earthquake` and `veto`.

## Projects

| Project | What it is |
|---|---|
| [OLED system HUD](https://github.com/netteNz/oled-bonnet) | A system-monitor display for a Raspberry Pi, built on a partial-update OLED driver |
| [Trading dashboard](https://github.com/netteNz/trading-dashboard) | A self-hosted charting dashboard with a custom indicator engine and live streaming |
| [RL trading bot](https://github.com/netteNz/reinforcement-learning-stocks) | Reinforcement learning (PPO, stable-baselines3) in a custom Gymnasium trading environment |
| [MacroPad firmware](https://github.com/netteNz/macropad-profiles) | CircuitPython firmware for an RP2040 macro pad: per-app key profiles and an OLED UI |
| [Web audio player](https://nettenz.github.io/web-audio-app) | A real-time audio visualizer with LUFS loudness metering |
| [Earthquake visualization](https://nettenz.github.io/earthquakes_pr.html) | An interactive map of Puerto Rico earthquake data, rendered with Python in the browser |
| [Veto system](https://nettenz.github.io/veto-tsd/) | A team decision-making tool with voting and vetoes |

## Notes

- **README rate limit:** README loading uses GitHub's unauthenticated API, which allows 60 requests per hour per visitor. Each README is cached for the browser session. If the limit is hit, the window shows the project summary and a link to GitHub instead.
- **Accessibility:** keyboard navigation throughout, a visible focus ring, and `prefers-reduced-motion` respected (which skips the splash and the meter animation).

---

**Emanuel Lugo Rivera** | [GitHub](https://github.com/netteNz) | [LinkedIn](https://www.linkedin.com/in/lugo-emanuel/)
