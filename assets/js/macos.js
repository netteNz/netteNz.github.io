class MacOSInterface {
    constructor() {
        this.windows = new Map();
        this.zIndex = 100;
        this.activeWindow = null;
        this.terminalEngines = new Map(); // Store terminal instances per window
        this.performanceOptimizations();
        this.waitForGSAP();
    }

    waitForGSAP() {
        if (typeof gsap === 'undefined') {
            setTimeout(() => this.waitForGSAP(), 50);
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
        // Animate page load
        gsap.from('#desktop', {
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        });

        // Enhanced dock hover animations with GSAP
        document.querySelectorAll('.dock-item').forEach(item => {
            const icon = item.querySelector('div');
            
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

        // Preload templates
        this.preloadTemplates();
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
            window: document.getElementById('window-template'),
            finder: document.getElementById('finder-app'),
            about: document.getElementById('about-app'),
            projects: document.getElementById('projects-app'),
            terminal: document.getElementById('terminal-app')
        };
    }

    init() {
        this.updateTime();
        this.setupEventListeners();
        setInterval(() => this.updateTime(), 1000);
        this.updateBatteryStatus();
        setInterval(() => this.updateBatteryStatus(), 30000); // Update every 30 seconds
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
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(timeElement,
                    { opacity: 0.7 },
                    { opacity: 1, duration: 0.3, ease: 'power1.out' }
                );
            }
            timeElement.textContent = timeString;
        }
    }

    updateBatteryStatus() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then((battery) => {
                const percentage = Math.round(battery.level * 100);
                const batteryText = document.querySelector('.battery-level-text');
                if (batteryText) {
                    batteryText.textContent = `${percentage}%`;
                }

                // Update battery icon color based on level
                const batteryIcon = document.querySelector('.battery-icon svg');
                if (batteryIcon) {
                    if (percentage <= 20) {
                        batteryIcon.className = 'w-4 h-4 battery-level-low';
                    } else if (percentage <= 50) {
                        batteryIcon.className = 'w-4 h-4 battery-level-medium';
                    } else {
                        batteryIcon.className = 'w-4 h-4 battery-level-high';
                    }
                }
            });
        }
    }

    setupEventListeners() {
        // Dock item clicks
        document.querySelectorAll('.dock-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const appName = item.dataset.app;
                this.openApp(appName);
            });
        });

        // Navbar item clicks
        document.querySelectorAll('[data-app]').forEach(item => {
            if (!item.classList.contains('dock-item')) {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const appName = item.dataset.app;
                    this.openApp(appName);
                });
            }
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
        this.windows.set(appName, windowElement);

        // Position window
        this.positionWindow(windowElement);

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
        header.style.backgroundColor = 'var(--terminal-header-bg, #1a1a1a)';

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

            // Apply terminal styling to content
            this.applyTerminalStyling(windowContent, appName);
        }

        return windowElement;
    }

    applyTerminalStyling(contentElement, appName) {
        // Add terminal styling based on app type
        if (appName === 'terminal' || appName === 'projects') {
            contentElement.classList.add('terminal-content');
        }
        // Apply general terminal styling for other apps
        contentElement.style.background = 'var(--terminal-bg)';
        contentElement.style.color = 'var(--terminal-text)';
        contentElement.style.fontFamily = "'Monaco', 'Menlo', 'Ubuntu Mono', monospace";
    }

    getAppTitle(appName) {
        const titles = {
            'finder': 'Finder',
            'about': 'about.md ~ Emanuel Lugo',
            'projects': 'projects/ ~ Portfolio',
            'terminal': 'Terminal ~ nettenzOS'
            // Removed contact title
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
        }
    }

    setupTerminalWithEngine(windowElement, initialPath) {
        setTimeout(() => {
            const content = windowElement.querySelector('.terminal-content');
            const appName = windowElement.dataset.app;

            if (content) {
                // Create new terminal engine instance
                const terminal = new TerminalEngine();
                this.terminalEngines.set(appName, terminal);
                
                // Initialize terminal
                terminal.createTerminal(content, initialPath);

                // Focus input when clicking anywhere in the window
                const focusInput = (e) => {
                    if (e && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON')) {
                        return;
                    }
                    const input = content.querySelector('#terminal-input');
                    if (input) {
                        input.focus();
                        input.setSelectionRange(input.value.length, input.value.length);
                    }
                };

                windowElement.addEventListener('click', focusInput);
                focusInput();
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

    closeActiveWindow() {
        if (this.activeWindow) {
            this.closeWindow(this.activeWindow);
        }
    }
}

// Initialize the MacOS interface when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.macOS = new MacOSInterface();
});
