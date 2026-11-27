// Window manager for the nettenzOS desktop: windows, dock, menu bar, level meter.
// Load order (all `defer`): gsap, dompurify -> projects-data.js -> terminal-engine.js -> readme-viewer.js -> macos.js.

const MOBILE_QUERY = '(max-width: 768px)';

// Default window sizes per app (clamped to the viewport in positionWindow)
const APP_SIZES = {
    welcome:  [560, 370],
    about:    [760, 640],
    projects: [820, 640],
    terminal: [820, 520],
    contact:  [520, 470],
    readme:   [760, 640]
};

// Smallest resizable size: keeps the traffic lights and a truncated title readable
const MIN_WINDOW = [360, 220];
const MENU_H = 32;
const DOCK_SPACE = 88; // matches positionWindow / maximize: keep windows clear of the dock
const RESIZE_EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

// Messages for ReadmeViewer failure reasons. Each ends by pointing at the fallback below it.
const README_FAILURES = {
    'rate-limit': "GitHub's rate limit for this browser is used up. The summary is below; the full README is on GitHub.",
    'not-found':  'This repository has no README on GitHub. The summary is below.',
    'offline':    'GitHub could not be reached. Check your connection and reopen this window; the summary is below.',
    'default':    'The README could not be loaded here. The summary is below; the full README is on GitHub.'
};

// http(s) only. new URL(undefined, base) resolves to ".../undefined", so reject non-strings first.
function safeUrl(url) {
    if (typeof url !== 'string' || !url) return '';
    try {
        const u = new URL(url, window.location.href);
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
    } catch { return ''; }
}

class MacOSInterface {
    constructor() {
        this.windows = new Map();
        this.zIndex = 100;
        this.activeWindow = null;
        this.terminalEngines = new Map();
        this.mobile = window.matchMedia(MOBILE_QUERY);

        this.detectRenderingMode();
        this.templates = {
            window:   document.getElementById('window-template'),
            about:    document.getElementById('about-app'),
            projects: document.getElementById('projects-app'),
            terminal: document.getElementById('terminal-app'),
            welcome:  document.getElementById('welcome-app'),
            contact:  document.getElementById('contact-app'),
            readme:   document.getElementById('readme-app')
        };

        this.init();
    }

    detectRenderingMode() {
        // WebGL-based GPU detection
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        let isSoftwareRendering = false;

        if (!gl) {
            // No WebGL support - likely software rendering
            isSoftwareRendering = true;
        } else {
            // Check for software renderer indicators
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
                isSoftwareRendering = renderer.includes('swiftshader')
                    || renderer.includes('software')
                    || renderer.includes('llvmpipe')
                    || renderer.includes('virtualbox');
            }
        }

        // Also check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (isSoftwareRendering || prefersReducedMotion) {
            document.documentElement.classList.add('software-rendering');
        }

        this.isSoftwareRendering = isSoftwareRendering;

        // Listen for reduced motion preference changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (e.matches) {
                document.documentElement.classList.add('software-rendering');
            } else if (!this.isSoftwareRendering) {
                document.documentElement.classList.remove('software-rendering');
            }
        });
    }

    init() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        this.setupEventListeners();
        this.meterRest = 3;
        this.meterLevel = this.meterRest;
        this.setMeter(this.meterRest);
        this.initSplash();
    }

    initSplash() {
        const splash = document.getElementById('splash-screen');
        const hasDeepLink = new URLSearchParams(window.location.search).get('open');

        let seen = false;
        try { seen = sessionStorage.getItem('seenSplash') === '1'; } catch { /* storage blocked */ }

        // Skip on deep links, reduced motion / software rendering, or after the first view this session
        if (!splash || hasDeepLink || seen || !this.motionOK()) {
            if (splash) splash.remove();
            if (!hasDeepLink) this.openApp('welcome');
            return;
        }

        try { sessionStorage.setItem('seenSplash', '1'); } catch { /* storage blocked */ }

        // ~0.9s meter fill + boot log, short hold, 0.3s fade = ~1.4s total
        setTimeout(() => {
            splash.classList.add('splash-exit');
            setTimeout(() => {
                splash.remove();
                this.openApp('welcome');
            }, 300);
        }, 1100);
    }

    motionOK() {
        return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            && !document.documentElement.classList.contains('software-rendering');
    }

    // ---- Level meter (signature element) ----
    // Static at rest; bumps in response to input and decays back one segment per tick.
    setMeter(level) {
        document.querySelectorAll('.level-meter').forEach(meter => {
            Array.from(meter.children).forEach((seg, i) => seg.classList.toggle('is-lit', i < level));
        });
    }

    bumpMeter(level = 5) {
        if (!this.motionOK()) return;
        const target = Math.max(this.meterRest, Math.min(8, Math.round(level)));
        if (target <= this.meterLevel && this.meterTimer) return;
        this.meterLevel = target;
        this.setMeter(target);

        clearInterval(this.meterTimer);
        this.meterTimer = setInterval(() => {
            if (this.meterLevel <= this.meterRest) {
                clearInterval(this.meterTimer);
                this.meterTimer = null;
                return;
            }
            this.meterLevel -= 1;
            this.setMeter(this.meterLevel);
        }, 70);
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        const timeElement = document.getElementById('current-time');
        if (timeElement && timeElement.textContent !== timeString) {
            timeElement.textContent = timeString;
        }
    }

    setupEventListeners() {
        // Dock, menu bar and desktop icons are all <button data-app>
        document.querySelectorAll('.dock-item, .menu-item, .desktop-icon').forEach(item => {
            item.addEventListener('click', () => this.openApp(item.dataset.app));
        });

        // Meter reacts to link hover (throttled)
        let lastHover = 0;
        document.addEventListener('pointerover', (e) => {
            if (!e.target.closest || !e.target.closest('a, .btn')) return;
            const now = performance.now();
            if (now - lastHover < 150) return;
            lastHover = now;
            this.bumpMeter(5);
        });

        // Esc closes the active window, except while typing in the terminal
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            if (e.target.closest && e.target.closest('.terminal-input')) return;
            if (!this.activeWindow) return;
            e.preventDefault();
            this.requestClose(this.activeWindow, { restoreFocus: true });
        });
    }

    openApp(appName) {
        if (appName === 'work') appName = 'projects';
        if (!this.templates[appName]) return;
        this.bumpMeter(6);

        // Already open: restore if minimized, then just focus it
        if (this.windows.has(appName)) {
            const existing = this.windows.get(appName);
            if (existing.classList.contains('minimized')) this.restoreWindow(appName);
            this.focusWindow(appName);
            return;
        }

        const windowElement = this.createWindow(appName);
        if (!windowElement) return;
        this.windows.set(appName, windowElement);

        const [w, h] = APP_SIZES[appName] || [820, 600];
        windowElement.style.width = `${w}px`;
        windowElement.style.height = `${h}px`;
        if (appName === 'welcome') {
            this.centerWindow(windowElement);
        } else {
            this.positionWindow(windowElement);
        }

        document.getElementById('windows-container').appendChild(windowElement);

        if (typeof gsap !== 'undefined' && this.motionOK()) {
            gsap.fromTo(windowElement,
                { scale: 0.96, opacity: 0, y: 12 },
                { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', clearProps: 'transform,opacity' });
        }

        this.setupWindowEvents(windowElement, appName);
        this.focusWindow(appName);
        this.setDockState(appName, true);
    }

    createWindow(appName) {
        const template = this.templates.window;
        const contentTemplate = this.templates[appName];
        if (!template || !contentTemplate) return null;

        const windowElement = template.content.cloneNode(true).querySelector('.window');
        const title = windowElement.querySelector('.window-title');
        windowElement.dataset.app = appName;
        title.textContent = this.getAppTitle(appName);
        title.id = `window-title-${appName}`;
        windowElement.setAttribute('aria-labelledby', title.id);

        windowElement.querySelector('.window-content').appendChild(contentTemplate.content.cloneNode(true));
        return windowElement;
    }

    getAppTitle(appName) {
        const titles = {
            about:    'about.md',
            projects: 'Work',
            terminal: 'Terminal',
            welcome:  'Welcome',
            contact:  'Contact',
            readme:   'README.md'
        };
        return titles[appName] || appName;
    }

    // Cascade new windows and keep them inside the viewport (above the dock)
    positionWindow(windowElement) {
        const menuH = 32;
        const dockSpace = 88;
        const maxW = window.innerWidth - 32;
        const maxH = window.innerHeight - menuH - dockSpace - 16;
        const w = Math.min(parseInt(windowElement.style.width, 10) || 820, maxW);
        const h = Math.min(parseInt(windowElement.style.height, 10) || 600, maxH);
        windowElement.style.width = `${w}px`;
        windowElement.style.height = `${h}px`;

        const offset = Math.min(this.windows.size * 28, 168);
        const left = Math.min(120 + offset, Math.max(16, window.innerWidth - w - 16));
        const top = Math.min(menuH + 24 + offset, Math.max(menuH + 8, window.innerHeight - dockSpace - h));
        windowElement.style.left = `${left}px`;
        windowElement.style.top = `${top}px`;
    }

    centerWindow(windowElement) {
        const w = Math.min(parseInt(windowElement.style.width, 10) || 560, window.innerWidth - 32);
        const h = parseInt(windowElement.style.height, 10) || 330;
        windowElement.style.width = `${w}px`;
        windowElement.style.left = `${Math.max(16, (window.innerWidth - w) / 2)}px`;
        windowElement.style.top = `${Math.max(40, (window.innerHeight - h) / 2 - 24)}px`;
    }

    setupWindowEvents(windowElement, appName) {
        const header = windowElement.querySelector('.window-header');

        this.makeDraggable(windowElement, header);
        this.makeResizable(windowElement);

        windowElement.querySelector('.window-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.requestClose(appName);
        });
        windowElement.querySelector('.window-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimizeWindow(appName);
        });
        windowElement.querySelector('.window-maximize').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMaximizeWindow(appName);
        });

        windowElement.addEventListener('pointerdown', () => this.focusWindow(appName, { keepFocus: true }));

        if (appName === 'terminal') {
            this.setupTerminalWithEngine(windowElement, '~');
        } else if (appName === 'projects') {
            this.renderWork(windowElement);
        } else if (appName === 'welcome') {
            this.setupWelcomeEvents(windowElement);
        } else if (appName === 'readme') {
            this.setupReadmeEvents(windowElement);
        }
    }

    // Pointer Events + pointer capture: works for mouse, pen and touch, and
    // attaches no document-level listeners. Disabled on the mobile sheet layout.
    makeDraggable(windowElement, handle) {
        let startX = 0, startY = 0, originLeft = 0, originTop = 0, dragging = false;

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || e.target.closest('.window-control')) return;
            if (this.mobile.matches || windowElement.classList.contains('maximized')) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            originLeft = windowElement.offsetLeft;
            originTop = windowElement.offsetTop;
            handle.setPointerCapture(e.pointerId);
            windowElement.classList.add('dragging');
        });

        handle.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const maxX = window.innerWidth - windowElement.offsetWidth;
            const maxY = window.innerHeight - 40; // keep the header reachable
            const x = Math.max(0, Math.min(originLeft + e.clientX - startX, maxX));
            const y = Math.max(32, Math.min(originTop + e.clientY - startY, maxY));
            windowElement.style.left = `${x}px`;
            windowElement.style.top = `${y}px`;
        });

        const end = (e) => {
            if (!dragging) return;
            dragging = false;
            windowElement.classList.remove('dragging');
            if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
        };
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
    }

    // Eight edge/corner handles, same Pointer Events + capture pattern as dragging.
    // Handles are siblings of the header, so they never trigger the header drag.
    makeResizable(windowElement) {
        RESIZE_EDGES.forEach(edge => {
            const handle = document.createElement('div');
            handle.className = 'window-resize';
            handle.dataset.edge = edge;
            handle.setAttribute('aria-hidden', 'true');
            windowElement.appendChild(handle);

            let start = null;

            handle.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                if (this.mobile.matches || windowElement.classList.contains('maximized')) return;
                e.preventDefault(); // no text selection / native drag
                start = {
                    x: e.clientX, y: e.clientY,
                    left: windowElement.offsetLeft, top: windowElement.offsetTop,
                    width: windowElement.offsetWidth, height: windowElement.offsetHeight
                };
                handle.setPointerCapture(e.pointerId);
                windowElement.classList.add('resizing');
                this.bumpMeter(4);
            });

            handle.addEventListener('pointermove', (e) => {
                if (!start) return;
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                const [minW, minH] = MIN_WINDOW;
                const right = start.left + start.width;
                const bottom = start.top + start.height;
                let { left, top, width, height } = start;

                // East/south grow from a fixed origin; cap at the viewport edge.
                if (edge.includes('e')) width = Math.max(minW, Math.min(start.width + dx, window.innerWidth - start.left));
                if (edge.includes('s')) {
                    // Stop above the dock, but never force-shrink a window already dragged past that line
                    const maxBottom = Math.max(window.innerHeight - DOCK_SPACE, bottom);
                    height = Math.max(minH, Math.min(start.height + dy, maxBottom - start.top));
                }
                // West/north move the origin and keep the opposite edge pinned:
                // clamp the new origin between the screen edge and (opposite edge - min size).
                if (edge.includes('w')) {
                    left = Math.max(0, Math.min(start.left + dx, right - minW));
                    width = right - left;
                }
                if (edge.includes('n')) {
                    top = Math.max(MENU_H, Math.min(start.top + dy, bottom - minH));
                    height = bottom - top;
                }

                // Inline px: positionWindow/maximize-restore read these back as strings
                windowElement.style.left = `${left}px`;
                windowElement.style.top = `${top}px`;
                windowElement.style.width = `${width}px`;
                windowElement.style.height = `${height}px`;
            });

            const end = (e) => {
                if (!start) return;
                start = null;
                windowElement.classList.remove('resizing');
                if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
            };
            handle.addEventListener('pointerup', end);
            handle.addEventListener('pointercancel', end);
        });
    }

    renderWork(windowElement) {
        const list = windowElement.querySelector('.work-list');
        if (!list) return;
        const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
        const el = (tag, className, text) => {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (text !== undefined) node.textContent = text;
            return node;
        };
        const link = (label, url, projectName) => {
            const a = el('a', 'work-link', label);
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', `${label}: ${projectName}`);
            return a;
        };

        list.replaceChildren();
        projects.forEach(project => {
            const row = el('li', 'work-row');

            const main = el('div', 'work-row-main');
            const live = safeUrl(project.live);
            const repo = safeUrl(project.repo);
            const home = live || repo;
            const heading = el('h2', 'work-name');
            if (home) {
                const a = el('a', '', project.name);
                a.href = home;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.setAttribute('aria-label', `${project.name}: open ${live ? 'live demo' : 'source on GitHub'}`);
                heading.append(a);
            } else {
                heading.textContent = project.name;
            }
            main.append(heading);
            main.append(el('p', 'work-summary', project.summary));
            if (project.stack && project.stack.length) {
                const tags = el('ul', 'tag-row work-stack');
                tags.setAttribute('aria-label', 'Stack');
                project.stack.forEach(t => tags.append(el('li', 'tag', t)));
                main.append(tags);
            }

            const links = el('div', 'work-links');
            if (live) links.append(link('Live demo', live, project.name));
            if (repo) links.append(link('Source', repo, project.name));
            const readme = el('button', 'work-link work-link--action', 'README');
            readme.type = 'button';
            readme.setAttribute('aria-label', `Read the ${project.name} README`);
            readme.addEventListener('click', () => this.openReadme(project.slug));
            links.append(readme);

            row.append(main, links);
            list.append(row);
        });
    }

    // ---- README window: one reused instance showing a project's GitHub README ----
    setupReadmeEvents(windowElement) {
        // In-page links (#section) scroll inside the window; they never change the page URL.
        windowElement.querySelector('.readme-body').addEventListener('click', (e) => {
            const a = e.target.closest && e.target.closest('a[href^="#"]');
            if (!a) return;
            e.preventDefault();
            let id = a.getAttribute('href').slice(1);
            try { id = decodeURIComponent(id); } catch { /* keep raw */ }
            const body = e.currentTarget;
            const target = [`user-content-${id}`, id]
                .map(candidate => body.querySelector(`[id="${CSS.escape(candidate)}"]`))
                .find(Boolean);
            if (target) target.scrollIntoView({ behavior: this.motionOK() ? 'smooth' : 'auto', block: 'start' });
        });
    }

    openReadme(slug) {
        const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
        const project = projects.find(p => p.slug === slug);
        if (!project) return;

        this.openApp('readme');
        const win = this.windows.get('readme');
        if (!win) return;

        const token = (this.readmeToken = (this.readmeToken || 0) + 1);
        const status = win.querySelector('.readme-status');
        const body = win.querySelector('.readme-body');
        const fallback = win.querySelector('.readme-fallback');
        const gh = win.querySelector('.readme-github');
        const scroller = win.querySelector('.window-content');

        win.querySelector('.window-title').textContent = `${project.slug}/README.md`;
        body.replaceChildren();
        fallback.replaceChildren();
        fallback.hidden = true;
        status.textContent = 'Loading README from GitHub\u2026';
        scroller.scrollTop = 0;

        const repo = safeUrl(project.repo);
        gh.hidden = !repo;
        if (repo) {
            gh.href = repo;
            gh.setAttribute('aria-label', `View ${project.name} on GitHub`);
        }

        const viewer = window.ReadmeViewer;
        const result = viewer ? viewer.load(project) : Promise.resolve({ ok: false, reason: 'error' });
        result.catch(() => ({ ok: false, reason: 'error' })).then((res) => {
            // Drop stale results: a newer request started, or the window was closed
            if (token !== this.readmeToken || this.windows.get('readme') !== win) return;

            if (res.ok) {
                status.textContent = '';
                body.append(res.fragment);
                return;
            }

            status.textContent = README_FAILURES[res.reason] || README_FAILURES.default;
            const summary = document.createElement('p');
            summary.className = 'readme-summary';
            summary.textContent = project.summary || '';
            fallback.append(summary);
            if (Array.isArray(project.readme) && project.readme.length) {
                const list = document.createElement('ul');
                list.className = 'md-list';
                project.readme.forEach(line => {
                    const li = document.createElement('li');
                    li.textContent = line;
                    list.append(li);
                });
                fallback.append(list);
            }
            fallback.hidden = false;
        });
    }

    setupWelcomeEvents(windowElement) {
        windowElement.querySelectorAll('[data-open]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.open;
                if (target) {
                    this.closeWindow('welcome');
                    this.openApp(target);
                }
            });
        });
    }

    // Synchronous: the window is already in the DOM, so the engine is usable immediately.
    setupTerminalWithEngine(windowElement, initialPath) {
        const content = windowElement.querySelector('.window-content .terminal-content');
        if (!content || typeof TerminalEngine === 'undefined') return;

        const appName = windowElement.dataset.app;
        const terminal = new TerminalEngine();
        this.terminalEngines.set(appName, terminal);
        terminal.createTerminal(content, initialPath);

        // Startup transcript's neofetch comes from the engine, so the skills have one source (SKILLS)
        const neofetchSlot = content.querySelector('[data-startup="neofetch"]');
        if (neofetchSlot) neofetchSlot.innerHTML = terminal.neofetchCommand();

        if (content.querySelector('#terminal-typing')) {
            terminal.runTypingEffect('terminal-typing', window.TERMINAL_ABOUT_PHRASES);
        }

        // Clicking anywhere in the terminal (except links/buttons) focuses the prompt
        const focusInput = (e) => {
            if (e && e.target.closest && e.target.closest('a, button')) return;
            const input = content.querySelector('.terminal-input');
            if (input) {
                input.focus({ preventScroll: true });
                input.setSelectionRange(input.value.length, input.value.length);
            }
        };
        windowElement.addEventListener('click', focusInput);
        setTimeout(() => focusInput(), 50);
    }

    requestClose(appName, { restoreFocus = false } = {}) {
        const windowElement = this.windows.get(appName);
        if (!windowElement) return;
        const done = () => {
            this.closeWindow(appName);
            if (restoreFocus) this.focusDockItem(appName);
        };
        if (typeof gsap !== 'undefined' && this.motionOK()) {
            gsap.to(windowElement, { scale: 0.96, opacity: 0, y: 12, duration: 0.18, ease: 'power2.in', onComplete: done });
        } else {
            done();
        }
    }

    closeWindow(appName) {
        const windowElement = this.windows.get(appName);
        if (!windowElement) return;

        windowElement.remove();
        this.terminalEngines.delete(appName);
        this.windows.delete(appName);
        this.setDockState(appName, false);
        if (this.activeWindow === appName) this.focusTopWindow();
    }

    // Minimize hides the window; the dock keeps its running dot and restores it.
    minimizeWindow(appName) {
        const windowElement = this.windows.get(appName);
        if (!windowElement) return;
        windowElement.classList.add('minimized');
        if (this.activeWindow === appName) this.focusTopWindow();
        this.focusDockItem(appName);
    }

    restoreWindow(appName) {
        const windowElement = this.windows.get(appName);
        if (!windowElement) return;
        windowElement.classList.remove('minimized');
        if (typeof gsap !== 'undefined' && this.motionOK()) {
            gsap.fromTo(windowElement, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', clearProps: 'transform,opacity' });
        }
    }

    toggleMaximizeWindow(appName) {
        const windowElement = this.windows.get(appName);
        if (!windowElement || this.mobile.matches) return;

        const isMaximized = windowElement.classList.contains('maximized');
        const duration = this.motionOK() ? 0.3 : 0;
        let target;

        if (!isMaximized) {
            windowElement.dataset.originalLeft = windowElement.style.left;
            windowElement.dataset.originalTop = windowElement.style.top;
            windowElement.dataset.originalWidth = windowElement.style.width;
            windowElement.dataset.originalHeight = windowElement.style.height;
            // Fill the desktop between the menu bar and the dock
            target = { left: '8px', top: '40px', width: `${window.innerWidth - 16}px`, height: `${window.innerHeight - 40 - 88}px` };
        } else {
            target = {
                left: windowElement.dataset.originalLeft,
                top: windowElement.dataset.originalTop,
                width: windowElement.dataset.originalWidth,
                height: windowElement.dataset.originalHeight
            };
        }

        windowElement.classList.toggle('maximized', !isMaximized);
        if (typeof gsap !== 'undefined' && duration) {
            gsap.to(windowElement, { ...target, duration, ease: 'power2.out' });
        } else {
            Object.assign(windowElement.style, target);
        }
    }

    focusWindow(appName, { keepFocus = false } = {}) {
        const windowElement = this.windows.get(appName);
        if (!windowElement) return;

        windowElement.style.zIndex = ++this.zIndex;
        this.activeWindow = appName;
        this.windows.forEach((el, name) => el.classList.toggle('is-active', name === appName));

        if (keepFocus) return;
        const input = windowElement.querySelector('.terminal-input');
        setTimeout(() => (input || windowElement).focus({ preventScroll: true }), 10);
    }

    // After a close/minimize, the highest visible window becomes active
    focusTopWindow() {
        let top = null;
        let topZ = -1;
        this.windows.forEach((el, name) => {
            const z = parseInt(el.style.zIndex, 10) || 0;
            if (!el.classList.contains('minimized') && z > topZ) {
                top = name;
                topZ = z;
            }
        });
        this.activeWindow = null;
        this.windows.forEach(el => el.classList.remove('is-active'));
        if (top) {
            this.activeWindow = top;
            this.windows.get(top).classList.add('is-active');
        }
    }

    setDockState(appName, running) {
        const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
        if (dockItem) dockItem.classList.toggle('active', running);
    }

    focusDockItem(appName) {
        const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
        if (dockItem) dockItem.focus({ preventScroll: true });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.macOS = new MacOSInterface();

    const openParam = new URLSearchParams(window.location.search).get('open');
    if (openParam) window.macOS.openApp(openParam);
});
