# nettenzOS Portfolio — Project Context Map

**Project:** macOS-inspired portfolio website with terminal emulator, audio visualization, and project showcase  
**Deployment:** GitHub Pages (`https://github.com/netteNz/netteNz.github.io`)  
**Tech Stack:** Vanilla HTML/CSS/JS, TailwindCSS, GSAP, Web Audio API, PyScript, Prism.js  
**Design System:** Material Design 3 Expressive tokens + terminal-green dark theme  

---

## Directory Structure

```
netteNz.github.io/
├── index.html                      # Main landing page (macOS desktop UI shell)
├── earthquakes_pr.html             # Puerto Rico seismic data visualization
├── README.md                        # Project overview & quick start
├── DESIGN_PRINCIPLES.md            # Complete design token & component system
├── CLAUDE.md                        # This file: codebase map & context
├── pyscript.toml                   # PyScript configuration for in-browser Python
│
├── assets/
│   ├── css/
│   │   └── main.css                # All design tokens, component styles, animations
│   ├── js/
│   │   ├── macos.js                # Window management, dock, menu bar logic
│   │   └── terminal-engine.js      # Terminal emulator, command parsing
│   ├── documents/
│   │   └── elr_2025_resume.pdf     # PDF resume (served via window)
│   └── icons/
│       ├── github.svg              # GitHub link icon (contact footer)
│       └── linkedin.svg            # LinkedIn link icon (contact footer)
│
├── projects/
│   └── earthquake-map/             # (referenced, not deployed in this repo)
│
├── .claude/
│   └── settings.local.json         # Claude Code project settings
├── .vscode/
│   ├── settings.json               # VS Code workspace config
│   └── tasks.json                  # Build/dev tasks (if any)
│
└── .gitignore                      # Git ignore patterns
```

---

## File Descriptions

### Root HTML Files

| File | Purpose | Key Elements |
|------|---------|---|
| `index.html` | Desktop UI shell; desktop wallpaper, menu bar, dock, window system | `<body>` contains: `.menu-bar`, `.dock-container`, `.windows-container`, `.wallpaper` |
| `earthquakes_pr.html` | Standalone seismic visualization (Puerto Rico); interactive map data | Imported via window in terminal as project demo |

### Core Styles: `assets/css/main.css`

**Role:** Single source of truth for all design tokens, components, animations, and responsiveness.

**Sections:**
- **CSS custom properties** (`:root`): M3 color roles, surface tonal scale, typography, duration/easing, shape scale
- **Base styles**: body, scrollbar, global text selection
- **Layout layers**: menu bar, dock, windows container, desktop icons
- **Component patterns**: `.window`, `.window-header`, `.traffic-light`, `.dock-item`, `.dock-label`, `.terminal-*`, `.md-btn-*`, `.md-chip`, `.glass-dark`
- **Animation keyframes**: `windowEnterM3`, `indicator-breath`, `blob-float-*`, `signal-pulse`, `battery-warning`, `blink-caret`, `typing`, `spin`, `pulse`, `fadeInDark`, `chart-grow`
- **Responsive breakpoints**: `≤768px`, `≤480px` (media queries)
- **Accessibility**: `@media (prefers-reduced-motion: reduce)` and `.software-rendering` class for low-end GPUs

**Key Facts:**
- All sizes, colors, timing use CSS custom properties — never raw values
- Every interactive element uses M3 state-layer pattern (`::`before pseudo-element)
- Dock and windows have multi-layer `box-shadow` + `backdrop-filter: blur()`
- Terminal accent colors: green `#00ff41`, blue `#38bdf8`, yellow `#fbbf24`, red `#f87171`

### macOS UI Logic: `assets/js/macos.js`

**Role:** Window management, dock behavior, menu bar status updates, desktop state.

**Responsibilities:**
1. **Window system**: create/open/minimize/maximize/close windows
2. **Dragging & resizing**: make windows draggable and resizable
3. **Dock interactions**: bounce on hover, launch apps, show tooltips
4. **Menu bar**: clock, battery level, WiFi signal, status icon animations
5. **Desktop icons**: click handlers for file/folder shortcuts
6. **State persistence**: track window z-index, active window

**Key Objects/Patterns:**
- Window instances tracked in global state
- Event delegation for traffic lights (close, minimize, maximize)
- Transform-based dragging (no repositioning reflow)
- Battery level class: `.battery-level-{high,medium,low}` triggers color/animation

### Terminal Emulator: `assets/js/terminal-engine.js`

**Role:** POSIX-like shell emulator; command parsing, file system simulation, project shortcuts.

**Built-in Commands:**
- `help` — show command list
- `ls` — list files/projects
- `cd <dir>` — change directory
- `pwd` — print working directory
- `cat <file>` — read file contents
- `whoami` — user info
- `readme` — show README.md
- `projects` — open projects window
- `neofetch` — system info
- `matrix` — "Matrix" effect (scrolling green text)
- `clear` — clear terminal
- `exit` — close terminal window

**Project Shortcuts:** `web-audio-player`, `earthquake-visualization`, `rl-trading-bot`, `veto-system` — map to project cards or external links

**Features:**
- Command history (arrow up/down navigation)
- Tab completion for commands & paths
- File system tree (simulated, not real filesystem access)
- Output formatting: colored directory/file/exe/symlink listings
- Typewriter effect on initial prompt reveal

### Configuration Files

| File | Purpose |
|------|---------|
| `pyscript.toml` | PyScript runtime config; enables in-browser Python REPL/scripts |
| `.vscode/settings.json` | Formatter, language settings, linting rules |
| `.vscode/tasks.json` | Build tasks (if defined; else empty) |
| `.claude/settings.local.json` | Claude Code project permissions, model, hooks |

---

## Key Technologies & Integrations

### 1. **Material Design 3 Expressive** (Design Tokens)
- Seeded from terminal green `#78ef9d`
- Eight surface tonal levels (`--md-surface` → `--md-surface-bright`)
- Four semantic roles (primary, secondary, tertiary, error)
- State layers: hover (0.08), press (0.12) opacity
- **Reference:** `DESIGN_PRINCIPLES.md` § 2. Colour System

### 2. **GSAP 3.12.5** (Animation Library)
- Loaded via CDN; used for smooth window entrance, scroll reveals
- ScrollTrigger plugin for reveal-on-scroll animations
- Spring easing used for dock hover bounce

### 3. **Web Audio API** (Audio Visualization)
- Frequency spectrum analysis via `AnalyserNode`
- LUFS metering (loudness units relative to full scale)
- Real-time visualization canvas (referenced in project cards, not in main UI)

### 4. **PyScript 2025.3.1** (In-Browser Python)
- Core CSS & JS loaded via CDN
- Allows terminal to execute Python snippets
- Configured in `pyscript.toml`

### 5. **TailwindCSS** (Utility Classes)
- Loaded via CDN; used primarily for responsive spacing, flexbox, grid
- Custom tokens override Tailwind defaults in `main.css`
- No Tailwind plugins; all custom animations defined in `main.css`

### 6. **Prism.js** (Syntax Highlighting)
- Okaidia theme for code blocks
- Python syntax highlighting loaded (used in terminal code display)
- Applied to `<pre class="language-*">` blocks

### 7. **Google Analytics** (gtag.js)
- Tracking ID: `G-0L5LLER0MH`
- Initialized in `<head>` of `index.html`

---

## Design System Overview

### Color Palette (CSS Custom Properties)
```css
Primary:    #78ef9d  (terminal green)
Secondary:  #7dd5f6  (cool cyan)
Tertiary:   #d4b0ff  (soft purple)
Error:      #ffb4ab  (warm red)

Surfaces:   #0c0c0f → #2a2a2e (eight tonal steps)
Outline:    #3a3a44 (standard), #1f1f29 (subtle)
```

### Typography
- **UI shell** (menu bar, dock, buttons): `Lato` sans-serif
- **Code/Terminal**: `Monaco`, `Menlo`, `Ubuntu Mono` monospace
- **Markdown viewer**: `Fira Code` monospace
- **Scale**: 11px (labels) → 20px (headings)

### Motion Tokens
```css
Durations:  100ms, 200ms, 300ms, 400ms, 500ms
Easing:     standard (most), emphasized (scroll reveals), spring (dock)
```

### Shape Scale
```css
xs: 4px   | sm: 8px   | md: 12px  | lg: 16px
xl: 20px  | 2xl: 28px | full: 100px (pills, rounded container)
```

### Component Patterns
- **M3 State Layer**: All interactive elements use `::before` pseudo-element for hover/press overlays
- **Glass Effect** (`.glass-dark`): `backdrop-filter: blur(32px)`, inset green highlight
- **Window System**: Sticky header, draggable, resizable, z-index managed
- **Dock**: Spring-eased bounce on hover, breathing active indicator

---

## Development Patterns

### Adding a New Window
1. Define a new `.window` div with `data-app` attribute
2. Add window header with `.window-header` and `.traffic-light` controls
3. Place content in `.window-content` (scrollable, contained layout)
4. In `macos.js`, add window instance to global state + event listeners
5. Styles automatically inherit from `.window` base + `[data-app]` variant

### Adding a Terminal Command
1. Open `assets/js/terminal-engine.js`
2. Locate the command parser (switch statement or object map)
3. Add new command handler with input parsing
4. Return output as string or HTML (formatted with terminal classes)
5. Example: `cat` reads from simulated file system; `pwd` returns current path

### Adding a Project to Portfolio
1. Create project card in HTML or via JavaScript DOM
2. Link to terminal via project shortcut (e.g., `web-audio-player` maps to window/link)
3. Add project metadata: title, description, link, technologies
4. Style via `.project-card` or similar scoped class (extends `.glass-dark` base)

### Responsive Adjustments
1. Media queries in `main.css` at 768px and 480px breakpoints
2. Windows scale via `!important` width/height overrides (JS sets inline)
3. Dock items scale via `transform: scale()` (no layout shift)
4. Status icons hide progressively (first two hidden at ≤480px)

### Accessibility
- Wallpaper is `aria-hidden="true"` (decorative)
- `@media (prefers-reduced-motion: reduce)` disables all animations
- `.software-rendering` class for low-end GPU fallback
- Keyboard navigation in terminal (arrow keys, tab completion)

---

## Common Tasks

### Modify a Color Token
→ Edit `:root` in `main.css`; all references update automatically

### Change Window Default Size
→ Edit `.window` `width/height` in `main.css` or `macos.js` instantiation

### Add New Dock Item
→ Add `.dock-item` to HTML + icon; add JS handler in `macos.js` `launchApp()`

### Adjust Animation Timing
→ Edit `--dur-*` or `--ease-*` custom properties in `:root`

### Test on Mobile
→ Resize browser to ≤768px or ≤480px; media queries kick in; dock scales, windows reflow

---

## References

- **Design System Details:** `DESIGN_PRINCIPLES.md` (full token breakdown, component specs)
- **README:** Quick start, feature list, terminal command reference
- **GitHub:** `https://github.com/netteNz/netteNz.github.io`
- **Live Site:** `https://nettenz.github.io/`
