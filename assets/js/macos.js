class MacOSInterface {
    constructor() {
        this.windows = new Map();
        this.zIndex = 100;
        this.activeWindow = null;
        this.terminalEngines = new Map();
        this.performanceOptimizations();
        this.waitForDependencies();
    }

    waitForDependencies() {
        // Wait for GSAP, TerminalEngine, AND critical DOM elements
        const desktop = document.getElementById('desktop');
        const dockItems = document.querySelectorAll('.dock-item');
        
        if (typeof gsap === 'undefined' || 
            typeof TerminalEngine === 'undefined' ||
            !desktop ||
            dockItems.length === 0) {
            console.log('Waiting for dependencies...', {
                gsap: typeof gsap !== 'undefined',
                TerminalEngine: typeof TerminalEngine !== 'undefined',
                desktop: !!desktop,
                dockItems: dockItems.length
            });
            setTimeout(() => this.waitForDependencies(), 50);
            return;
        }

        // Initialize GSAP plugins
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
        }

        this.init();
        this.initGSAPAnimations();
    }

    initGSAPAnimations() {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;

        // Animate page load
        gsap.from(desktop, {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        });

        // Enhanced dock hover animations with null checks
        document.querySelectorAll('.dock-item').forEach(item => {
            const icon = item.querySelector('div');
            if (!icon) return; // Skip if icon doesn't exist

            // Set initial transform origin for better animations
            gsap.set(icon, { transformOrigin: 'center center' });

            item.addEventListener('mouseenter', () => {
                gsap.to(icon, {
                    scale: 1.2,
                    y: -8,
                    duration: 0.3,
                    ease: 'back.out(1.7)'
                });
            });

            item.addEventListener('mouseleave', () => {
                gsap.to(icon, {
                    scale: 1,
                    y: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        });
    }

    performanceOptimizations() {
        // Debounce window updates
        this.debouncedUpdateTime = this.debounce(() => this.updateTime(), 1000);

        // Use requestAnimationFrame for smooth animations
        this.animationQueue = [];
        this.isAnimating = false;

        // Detect hardware/software rendering mode
        this.detectRenderingMode();

        // Preload templates
        this.preloadTemplates();
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
            console.log('🖥️ Software rendering mode enabled for better performance');
        }

        // Store for other components to check
        this.isSoftwareRendering = isSoftwareRendering;
        this.prefersReducedMotion = prefersReducedMotion;

        // Listen for reduced motion preference changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            if (e.matches) {
                document.documentElement.classList.add('software-rendering');
            } else if (!this.isSoftwareRendering) {
                document.documentElement.classList.remove('software-rendering');
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    preloadTemplates() {
        // Cache template elements for better performance
        this.templates = {
            window:   document.getElementById('window-template'),
            about:    document.getElementById('about-app'),
            projects: document.getElementById('projects-app'),
            terminal: document.getElementById('terminal-app'),
            welcome:  document.getElementById('welcome-app'),
            contact:  document.getElementById('contact-app')
        };
    }

    init() {
        this.updateTime();
        this.setupEventListeners();
        setInterval(() => this.updateTime(), 1000);
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

        // ~0.9s meter fill + 0.3s fade = ~1.2s total
        setTimeout(() => {
            splash.classList.add('splash-exit');
            setTimeout(() => {
                splash.remove();
                this.openApp('welcome');
            }, 300);
        }, 900);
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

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.metaKey || e.ctrlKey) {
                switch (e.key) {
                    case 'w':
                        e.preventDefault();
                        this.closeActiveWindow();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.closeActiveWindow();
                        break;
                }
            }
        });
    }

    openApp(appName) {
        if (appName === 'work') appName = 'projects';
        if (!this.templates[appName]) return;
        this.bumpMeter(6);

        // Check if app is already open
        if (this.windows.has(appName)) {
            this.focusWindow(appName);
            // Shake animation for existing window with GSAP
            const windowElement = this.windows.get(appName);
            if (typeof gsap !== 'undefined') {
                gsap.to(windowElement, {
                    x: -10,
                    duration: 0.05,
                    repeat: 5,
                    yoyo: true,
                    ease: 'power1.inOut',
                    onComplete: () => {
                        gsap.set(windowElement, { x: 0 });
                    }
                });
            }
            return;
        }

        const windowElement = this.createWindow(appName);

        // Override dimensions for specific apps
        if (appName === 'welcome') {
            windowElement.style.width = '560px';
            windowElement.style.height = '330px';
        }

        this.windows.set(appName, windowElement);

        // Position window
        if (appName === 'welcome') {
            this.centerWindow(windowElement);
        } else {
            this.positionWindow(windowElement);
        }

        // Add to DOM
        const container = document.getElementById('windows-container') || document.body;
        container.appendChild(windowElement);

        // Animate with GSAP
        if (typeof gsap !== 'undefined') {
            gsap.set(windowElement, {
                scale: 0.8,
                opacity: 0,
                y: 50
            });

            gsap.to(windowElement, {
                scale: 1,
                opacity: 1,
                y: 0,
                duration: 0.4,
                ease: 'back.out(1.4)'
            });
        } else {
            // Fallback CSS animation
            windowElement.classList.add('window-enter');
        }

        // Focus the new window
        this.focusWindow(appName);

        // Setup window-specific functionality
        this.setupWindowEvents(windowElement, appName);

        // Mark dock item as active
        const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
        if (dockItem) dockItem.classList.add('active');
    }

    createWindow(appName) {
        const template = this.templates.window;
        if (!template) return null;

        const windowElement = template.content.cloneNode(true).querySelector('.window');

        // Set window properties
        windowElement.dataset.app = appName;
        windowElement.querySelector('.window-title').textContent = this.getAppTitle(appName);

        // Update window header with terminal styling
        const header = windowElement.querySelector('.window-header');
        header.className = 'window-header';
        // Ensure header stays on top
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '10';
        // header background controlled via CSS per-app rules ([data-app] .window-header)

        // Update window controls
        const controls = header.querySelector('.window-controls');
        if (controls) {
            controls.style.position = 'relative';
            controls.style.zIndex = '11';
            const closeBtn = controls.children[0];
            const minimizeBtn = controls.children[1];
            const maximizeBtn = controls.children[2];

            if (closeBtn) closeBtn.className = 'window-control window-close';
            if (minimizeBtn) minimizeBtn.className = 'window-control window-minimize';
            if (maximizeBtn) maximizeBtn.className = 'window-control window-maximize';
        }

        // Load app content
        const contentTemplate = this.templates[appName];
        if (contentTemplate) {
            const content = contentTemplate.content.cloneNode(true);
            const windowContent = windowElement.querySelector('.window-content');
            // Ensure content is scrollable and doesn't overlap header
            windowContent.style.overflowY = 'auto';
            windowContent.style.position = 'relative';
            windowContent.appendChild(content);

            // Apply terminal styling to content (but NOT the terminal-content class)
            this.applyTerminalStyling(windowContent, appName);

            // IMPORTANT: Explicitly remove terminal-content class from window-content
            // to prevent double-nesting issues (the template already has this class)
            windowContent.classList.remove('terminal-content');
        }

        return windowElement;
    }

    applyTerminalStyling(contentElement, appName) {
        // Skip terminal styling for apps with their own design
        if (appName === 'about' || appName === 'welcome' || appName === 'contact') {
            return;
        }

        // Apply general terminal styling for other apps
        contentElement.style.background = 'var(--terminal-bg)';
        contentElement.style.color = 'var(--terminal-text)';
        contentElement.style.fontFamily = "'Monaco', 'Menlo', 'Ubuntu Mono', monospace";
    }

    getAppTitle(appName) {
        const titles = {
            'about':    'about.md',
            'projects': 'Work',
            'terminal': 'Terminal',
            'welcome':  'Welcome',
            'contact':  'Contact'
        };
        return titles[appName] || `${appName}.app`;
    }

    positionWindow(windowElement) {
        const offset = this.windows.size * 30;
        const maxOffset = 200;
        const actualOffset = Math.min(offset, maxOffset);

        windowElement.style.left = `${100 + actualOffset}px`;
        windowElement.style.top = `${100 + actualOffset}px`;
        windowElement.style.zIndex = ++this.zIndex;
    }

    centerWindow(windowElement) {
        const w = parseInt(windowElement.style.width) || 560;
        const h = parseInt(windowElement.style.height) || 330;
        windowElement.style.left = `${Math.max(0, (window.innerWidth - w) / 2)}px`;
        windowElement.style.top  = `${Math.max(40, (window.innerHeight - h) / 2)}px`;
        windowElement.style.zIndex = ++this.zIndex;
    }

    setupWindowEvents(windowElement, appName) {
        const header = windowElement.querySelector('.window-header');
        const closeBtn = windowElement.querySelector('.window-close');
        const minimizeBtn = windowElement.querySelector('.window-minimize');
        const maximizeBtn = windowElement.querySelector('.window-maximize');

        // Window dragging
        this.makeDraggable(windowElement, header);

        // Window controls with GSAP
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof gsap !== 'undefined') {
                    gsap.to(windowElement, {
                        scale: 0.8,
                        opacity: 0,
                        y: 50,
                        duration: 0.3,
                        ease: 'back.in(1.4)',
                        onComplete: () => {
                            this.closeWindow(appName);
                        }
                    });
                } else {
                    this.closeWindow(appName);
                }
            });
        }

        if (minimizeBtn) {
            // Disable minimize functionality
            minimizeBtn.style.opacity = '0.3';
            minimizeBtn.style.cursor = 'not-allowed';
            minimizeBtn.disabled = true;
        }

        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMaximizeWindow(appName);
            });
        }

        // Window focus
        windowElement.addEventListener('mousedown', () => this.focusWindow(appName));

        // App-specific setup
        this.setupAppSpecificEvents(windowElement, appName);
    }

    makeDraggable(windowElement, handle) {
        let isDragging = false;
        let currentX, currentY, initialX, initialY;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-control')) return;

            isDragging = true;
            initialX = e.clientX - windowElement.offsetLeft;
            initialY = e.clientY - windowElement.offsetTop;

            windowElement.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                // Constrain to viewport
                const maxX = window.innerWidth - windowElement.offsetWidth;
                const maxY = window.innerHeight - windowElement.offsetHeight;

                currentX = Math.max(0, Math.min(currentX, maxX));
                currentY = Math.max(32, Math.min(currentY, maxY));

                // Use GSAP for smooth dragging
                if (typeof gsap !== 'undefined') {
                    gsap.set(windowElement, {
                        left: currentX + 'px',
                        top: currentY + 'px'
                    });
                } else {
                    windowElement.style.left = `${currentX}px`;
                    windowElement.style.top = `${currentY}px`;
                }
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            windowElement.style.cursor = '';
        });
    }

    setupAppSpecificEvents(windowElement, appName) {
        if (appName === 'terminal') {
            this.setupTerminalWithEngine(windowElement, '~');
        } else if (appName === 'projects') {
            this.setupTerminalWithEngine(windowElement, '~/projects');
        } else if (appName === 'welcome') {
            this.setupWelcomeEvents(windowElement);
        }
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

    setupTerminalWithEngine(windowElement, initialPath) {
        setTimeout(() => {
            // Ensure .window-content doesn't have terminal-content class (prevent double-nesting)
            const windowContent = windowElement.querySelector('.window-content');
            if (windowContent) {
                windowContent.classList.remove('terminal-content');
            }

            // Target the actual terminal content (the first .terminal-content child, not the window-content)
            const content = windowContent ? windowContent.querySelector('.terminal-content') : windowElement.querySelector('.terminal-content');
            const appName = windowElement.dataset.app;

            if (content) {
                // Check if TerminalEngine is available
                if (typeof TerminalEngine === 'undefined') {
                    console.error('TerminalEngine not loaded!');
                    content.innerHTML = '<div style="color: red; padding: 20px;">Error: Terminal engine not loaded. Please refresh the page.</div>';
                    return;
                }

                // Create new terminal engine instance
                const terminal = new TerminalEngine();
                this.terminalEngines.set(appName, terminal);

                // Initialize terminal
                terminal.createTerminal(content, initialPath);

                // Start typing effect for initial terminal content (about.md display)
                const typingElement = content.querySelector('#terminal-typing');
                if (typingElement && appName === 'terminal') {
                    terminal.runTypingEffect('terminal-typing', window.TERMINAL_ABOUT_PHRASES);
                }

                // Focus input when clicking anywhere in the window
                const focusInput = (e) => {
                    if (e && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON')) {
                        return;
                    }
                    const input = content.querySelector('.terminal-input');
                    if (input) {
                        input.focus();
                        input.setSelectionRange(input.value.length, input.value.length);
                    }
                };

                windowElement.addEventListener('click', focusInput);

                // Delay initial focus to ensure DOM is ready
                setTimeout(() => focusInput(), 200);
            }
        }, 100);
    }

    closeWindow(appName) {
        if (!this.windows.has(appName)) return;

        const windowElement = this.windows.get(appName);

        if (windowElement.parentNode) {
            windowElement.parentNode.removeChild(windowElement);
        }

        // Clean up terminal engine instance
        this.terminalEngines.delete(appName);
        this.windows.delete(appName);

        if (this.activeWindow === appName) {
            this.activeWindow = null;
        }

        // Remove active indicator from dock
        const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
        if (dockItem) dockItem.classList.remove('active');
    }

    toggleMaximizeWindow(appName) {
        if (!this.windows.has(appName)) return;

        const windowElement = this.windows.get(appName);
        const isMaximized = windowElement.classList.contains('maximized');

        if (typeof gsap !== 'undefined') {
            if (!isMaximized) {
                // Store original dimensions
                windowElement.dataset.originalLeft = windowElement.style.left;
                windowElement.dataset.originalTop = windowElement.style.top;
                windowElement.dataset.originalWidth = windowElement.style.width;
                windowElement.dataset.originalHeight = windowElement.style.height;

                // Maximize animation
                gsap.to(windowElement, {
                    left: '20px',
                    top: '40px',
                    width: 'calc(100vw - 120px)',
                    height: 'calc(100vh - 60px)',
                    duration: 0.4,
                    ease: 'power2.out'
                });

                windowElement.classList.add('maximized');
            } else {
                // Restore animation
                gsap.to(windowElement, {
                    left: windowElement.dataset.originalLeft,
                    top: windowElement.dataset.originalTop,
                    width: windowElement.dataset.originalWidth,
                    height: windowElement.dataset.originalHeight,
                    duration: 0.4,
                    ease: 'power2.out'
                });

                windowElement.classList.remove('maximized');
            }
        } else {
            windowElement.classList.toggle('maximized');
        }
    }

    focusWindow(appName) {
        if (!this.windows.has(appName)) return;

        const windowElement = this.windows.get(appName);
        windowElement.style.zIndex = ++this.zIndex;
        this.activeWindow = appName;

        // Focus the terminal input if it exists
        const input = windowElement.querySelector('.terminal-input');
        if (input) {
            setTimeout(() => input.focus(), 10);
        }
    }

    closeActiveWindow() {
        if (this.activeWindow) {
            this.closeWindow(this.activeWindow);
        }
    }
}

// Initialize the MacOS interface when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing MacOS Interface');
    window.macOS = new MacOSInterface();

    const openParam = new URLSearchParams(window.location.search).get('open');
    if (openParam) {
        window.macOS.openApp(openParam);
    }
});
