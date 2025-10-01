class MacOSInterface {
    constructor() {
        this.windows = new Map();
        this.zIndex = 100;
        this.activeWindow = null;
        this.performanceOptimizations();
        this.init();
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
        if (timeElement) {
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
            return;
        }

        const windowElement = this.createWindow(appName);
        this.windows.set(appName, windowElement);

        // Position window
        this.positionWindow(windowElement);

        // Add to DOM with animation
        const container = document.getElementById('windows-container') || document.body;
        container.appendChild(windowElement);

        // Use requestAnimationFrame for smooth animation
        requestAnimationFrame(() => {
            windowElement.classList.add('window-enter');
        });

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

        // Window controls
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeWindow(appName);
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
                currentY = Math.max(32, Math.min(currentY, maxY)); // Account for menu bar

                windowElement.style.left = `${currentX}px`;
                windowElement.style.top = `${currentY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            windowElement.style.cursor = '';
        });
    }

    setupAppSpecificEvents(windowElement, appName) {
        if (appName === 'terminal') {
            this.setupTerminal(windowElement);
        } else if (appName === 'projects') {
            this.setupProjectsTerminal(windowElement);
        }
    }

    setupProjectsTerminal(windowElement) {
        setTimeout(() => {
            const content = windowElement.querySelector('.terminal-content');
            const input = windowElement.querySelector('#terminal-input');

            if (input && content) {
                // Clear any existing event listeners
                const newInput = input.cloneNode(true);
                input.replaceWith(newInput);

                // Add keydown event listener
                const handleKeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        const command = newInput.value.trim();
                        if (command) {
                            this.executeProjectCommand(command, content);
                            newInput.value = '';
                        }
                    }
                };
                
                newInput.addEventListener('keydown', handleKeydown);

                // Focus input when clicking anywhere in the window
                const focusInput = (e) => {
                    // Don't focus if clicking on a link or button
                    if (e && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON')) {
                        return;
                    }
                    newInput.focus();
                    newInput.setSelectionRange(newInput.value.length, newInput.value.length);
                };

                windowElement.addEventListener('click', focusInput);
                focusInput();
            }
        }, 100);
    }

    setupTerminal(windowElement) {
        setTimeout(() => {
            const content = windowElement.querySelector('.terminal-content');
            const input = windowElement.querySelector('#terminal-input');

            if (input && content) {
                // Clear any existing event listeners
                const newInput = input.cloneNode(true);
                input.replaceWith(newInput);

                // Add keydown event listener
                const handleKeydown = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        const command = newInput.value.trim();
                        if (command) {
                            this.executeTerminalCommand(command, content);
                            newInput.value = '';
                        }
                    }
                };
                
                newInput.addEventListener('keydown', handleKeydown);

                // Focus input when clicking anywhere in the window
                const focusInput = (e) => {
                    // Don't focus if clicking on a link or button
                    if (e && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON')) {
                        return;
                    }
                    newInput.focus();
                    newInput.setSelectionRange(newInput.value.length, newInput.value.length);
                };

                windowElement.addEventListener('click', focusInput);
                focusInput();
            }
        }, 100);
    }

    executeProjectCommand(command, terminalContent) {
        const currentPathElement = terminalContent.querySelector('.terminal-path:last-of-type');
        const currentPath = currentPathElement ? currentPathElement.textContent : '~/projects';

        // Create command echo line
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `<span class="terminal-prompt">emanuel@nettenzOS</span>:<span class="terminal-path">${currentPath}</span>$ ${command}`;

        // Create output container
        const output = document.createElement('div');
        output.className = 'terminal-output';
        output.style.marginBottom = '16px';

        // Handle cd commands
        if (command.startsWith('cd ')) {
            const targetDir = command.substring(3).trim();
            this.handleProjectCd(targetDir, terminalContent, currentPath);
            return;
        }

        // Handle commands
        switch (command.toLowerCase()) {
            case 'web-audio-player':
            case 'web-audio':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Opening web audio player...</div>`;
                setTimeout(() => {
                    window.open('https://nettenz.github.io/web-audio-app', '_blank');
                }, 500);
                break;
            case 'earthquake-visualization':
            case 'earthquake':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Opening earthquake visualization...</div>`;
                setTimeout(() => {
                    window.open('https://nettenz.github.io/earthquakes_pr.html', '_blank');
                }, 500);
                break;
            case 'door-dashboard':
            case 'dashboard':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Opening DoorDash dashboard...</div>`;
                setTimeout(() => {
                    window.open('https://nettenz.github.io/DoorDashboard', '_blank');
                }, 500);
                break;
            case 'veto-system':
            case 'veto':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Opening veto system...</div>`;
                setTimeout(() => {
                    window.open('https://nettenz.github.io/veto-tsd/', '_blank');
                }, 500);
                break;
            case 'ls':
                if (currentPath === '~/projects') {
                    output.innerHTML = `<div style="color: var(--terminal-accent);">web-audio-player/&nbsp;&nbsp;&nbsp;&nbsp;earthquake-visualization/&nbsp;&nbsp;&nbsp;&nbsp;door-dashboard/&nbsp;&nbsp;&nbsp;&nbsp;veto-system/</div>`;
                } else {
                    output.innerHTML = `<div style="color: var(--terminal-accent);">README.md&nbsp;&nbsp;&nbsp;&nbsp;src/&nbsp;&nbsp;&nbsp;&nbsp;package.json&nbsp;&nbsp;&nbsp;&nbsp;deploy.sh</div>`;
                }
                break;
            case 'pwd':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">${currentPath === '~/projects' ? '/Users/emanuel/projects' : `/Users/emanuel/${currentPath.replace('~/', '')}`}</div>`;
                break;
            case 'help':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary); line-height: 1.6;">Available commands:
- ls: List directory contents
- cd [directory]: Change directory  
- pwd: Show current directory
- clear: Clear terminal
- exit: Close window

🚀 Project Commands (opens deployed apps):
- web-audio-player: Real-time audio visualizer with LUFS meter
- earthquake-visualization: Interactive Puerto Rico earthquake data
- door-dashboard: DoorDash analytics dashboard  
- veto-system: Team decision voting system

💡 Short aliases: web-audio, earthquake, dashboard, veto</div>`;
                break;
            case 'cat readme':
            case 'readme':
                if (currentPath !== '~/projects') {
                    const projectName = currentPath.split('/').pop();
                    output.innerHTML = this.getProjectReadme(projectName);
                } else {
                    output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Navigate to a specific project directory first. Try: cd web-audio-player</div>`;
                }
                break;
            case 'clear':
                this.clearProjectsTerminal(terminalContent);
                return;
            case 'exit':
                const appName = terminalContent.closest('.window').dataset.app;
                this.closeWindow(appName);
                return;
            default:
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">zsh: command not found: ${command}. Type 'help' for available commands.</div>`;
        }

        // Insert command and output before input line
        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer && inputContainer.parentNode === terminalContent) {
            // inputContainer is a direct child of terminalContent
            terminalContent.insertBefore(commandLine, inputContainer);
            terminalContent.insertBefore(output, inputContainer);
        } else if (inputContainer) {
            // inputContainer exists but has a different parent, insert before it in its parent
            inputContainer.parentNode.insertBefore(commandLine, inputContainer);
            inputContainer.parentNode.insertBefore(output, inputContainer);
        } else {
            // No inputContainer found, just append
            terminalContent.appendChild(commandLine);
            terminalContent.appendChild(output);
        }

        // Scroll to bottom and focus input
        terminalContent.scrollTop = terminalContent.scrollHeight;
        const input = terminalContent.querySelector('#terminal-input');
        if (input) {
            setTimeout(() => input.focus(), 10);
        }
    }

    executeTerminalCommand(command, terminalContent) {
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `<span class="terminal-prompt">emanuel@nettenzOS</span>:<span class="terminal-path">~</span>$ ${command}`;

        const output = document.createElement('div');
        output.className = 'terminal-output';
        output.style.marginBottom = '16px';

        switch (command.toLowerCase()) {
            case 'help':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary); line-height: 1.6;">Available commands:
- help: Show this help message
- whoami: Display user information
- ls: List directory contents
- clear: Clear terminal
- <project-name>: Open project directory
- projects: Open projects directory
- exit: Close terminal</div>`;
                break;
            case 'whoami':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Emanuel Lugo Rivera - Full-Stack Engineer & Cybersecurity Specialist</div>`;
                break;
            case 'ls':
                output.innerHTML = `<div style="color: var(--terminal-accent);">projects/&nbsp;&nbsp;&nbsp;&nbsp;documents/&nbsp;&nbsp;&nbsp;&nbsp;about.md</div>`;
                break;
            case 'projects':
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Opening projects directory...</div>`;
                setTimeout(() => this.openApp('projects'), 500);
                break;
            // Removed contact case
            case 'clear':
                this.clearTerminal(terminalContent);
                return;
            case 'exit':
                const appName = terminalContent.closest('.window').dataset.app;
                this.closeWindow(appName);
                return;
            default:
                output.innerHTML = `<div style="color: var(--terminal-text-secondary);">Command not found: ${command}. Type 'help' for available commands.</div>`;
        }

        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer && inputContainer.parentNode === terminalContent) {
            // inputContainer is a direct child of terminalContent
            terminalContent.insertBefore(commandLine, inputContainer);
            terminalContent.insertBefore(output, inputContainer);
        } else if (inputContainer) {
            // inputContainer exists but has a different parent, insert before it in its parent
            inputContainer.parentNode.insertBefore(commandLine, inputContainer);
            inputContainer.parentNode.insertBefore(output, inputContainer);
        } else {
            // No inputContainer found, just append
            terminalContent.appendChild(commandLine);
            terminalContent.appendChild(output);
        }

        terminalContent.scrollTop = terminalContent.scrollHeight;
        const input = terminalContent.querySelector('#terminal-input');
        if (input) {
            setTimeout(() => input.focus(), 10);
        }
    }

    clearTerminal(terminalContent) {
        terminalContent.innerHTML = `
            <div class="terminal-input-line">
                <span class="terminal-prompt">emanuel@nettenzOS</span>:<span class="terminal-path">~</span>$ 
                <input type="text" id="terminal-input" class="terminal-input bg-transparent outline-none flex-1 ml-1" style="color: var(--terminal-accent); caret-color: var(--terminal-accent);" autofocus>
            </div>
        `;
        this.setupTerminal(terminalContent.closest('.window'));
    }

    clearProjectsTerminal(terminalContent) {
        terminalContent.innerHTML = `
            <div style="margin-bottom: 12px;">
                <span class="terminal-prompt">emanuel@nettenzOS</span>:<span class="terminal-path">~/projects</span>$ ls
            </div>
            <div style="margin-bottom: 16px; color: var(--terminal-accent);">
                web-audio-player/&nbsp;&nbsp;&nbsp;&nbsp;earthquake-visualization/&nbsp;&nbsp;&nbsp;&nbsp;door-dashboard/&nbsp;&nbsp;&nbsp;&nbsp;veto-system/
            </div>
            <div class="terminal-input-line">
                <span class="terminal-prompt">emanuel@nettenzOS</span>:<span class="terminal-path">~/projects</span>$ 
                <input type="text" id="terminal-input" class="terminal-input bg-transparent outline-none flex-1 ml-1" style="color: var(--terminal-accent); caret-color: var(--terminal-accent);" autofocus>
            </div>
        `;
        this.setupProjectsTerminal(terminalContent.closest('.window'));
    }

    handleProjectCd(targetDir, terminalContent, currentPath) {
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `<span class="terminal-prompt">emanuel@nettenzOS</span>:<span class="terminal-path">${currentPath}</span>$ cd ${targetDir}`;

        let newPath = currentPath;
        let output = '';

        if (targetDir === '..') {
            if (currentPath !== '~/projects') {
                newPath = '~/projects';
            }
        } else if (['web-audio-player', 'earthquake-visualization', 'door-dashboard', 'veto-system'].includes(targetDir)) {
            if (currentPath === '~/projects') {
                newPath = `~/projects/${targetDir}`;
            } else {
                output = `<div style="color: var(--terminal-text-secondary);">cd: no such file or directory: ${targetDir}</div>`;
            }
        } else if (targetDir === '~' || targetDir === '') {
            newPath = '~/projects';
        } else {
            output = `<div style="color: var(--terminal-text-secondary);">cd: no such file or directory: ${targetDir}</div>`;
        }

        // Insert command
        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer && inputContainer.parentNode === terminalContent) {
            // inputContainer is a direct child of terminalContent
            terminalContent.insertBefore(commandLine, inputContainer);

            if (output) {
                const outputDiv = document.createElement('div');
                outputDiv.className = 'terminal-output';
                outputDiv.style.marginBottom = '16px';
                outputDiv.innerHTML = output;
                terminalContent.insertBefore(outputDiv, inputContainer);
            }

            // Update the prompt path
            const promptPath = inputContainer.querySelector('.terminal-path');
            if (promptPath && newPath !== currentPath) {
                promptPath.textContent = newPath;
            }
        } else if (inputContainer) {
            // inputContainer exists but has a different parent
            inputContainer.parentNode.insertBefore(commandLine, inputContainer);

            if (output) {
                const outputDiv = document.createElement('div');
                outputDiv.className = 'terminal-output';
                outputDiv.style.marginBottom = '16px';
                outputDiv.innerHTML = output;
                inputContainer.parentNode.insertBefore(outputDiv, inputContainer);
            }

            // Update the prompt path
            const promptPath = inputContainer.querySelector('.terminal-path');
            if (promptPath && newPath !== currentPath) {
                promptPath.textContent = newPath;
            }
        }

        // Scroll to bottom and focus input
        terminalContent.scrollTop = terminalContent.scrollHeight;
        const input = terminalContent.querySelector('#terminal-input');
        if (input) {
            setTimeout(() => input.focus(), 10);
        }
    }

    getProjectReadme(projectName) {
        const readmes = {
            'web-audio-player': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">🎵 Web Audio Player</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.6;">
Real-time audio visualizer built with Web Audio API
- Live frequency spectrum analysis
- LUFS loudness metering
- Waveform visualization
- React + TypeScript architecture

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://nettenz.github.io/web-audio-app
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/web-audio-app
</div>`,
            'earthquake-visualization': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">🌍 Earthquake Visualization</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.6;">
Interactive map showing Puerto Rico earthquake data
- Real-time seismic data visualization
- Time-based filtering and analysis
- Geographic clustering of events
- D3.js + Leaflet implementation

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://nettenz.github.io/earthquakes_pr.html
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/earthquakes_pr
</div>`,
            'door-dashboard': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">📊 DoorDash Analytics Dashboard</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.6;">
Comprehensive analytics dashboard for delivery metrics
- Revenue and order tracking
- Driver performance analytics
- Customer satisfaction metrics
- Interactive charts and KPIs

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://nettenz.github.io/DoorDashboard
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/DoorDashboard
</div>`,
            'veto-system': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">🗳️ Veto Voting System</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.6;">
Team decision-making platform with veto capabilities
- Democratic voting with veto power
- Real-time decision tracking
- Team consensus building tools
- TypeScript + React implementation

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://nettenz.github.io/veto-tsd/
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/veto-tsd
</div>`
        };
        return readmes[projectName] || `<div style="color: var(--terminal-text-secondary);">README.md not found for this project.</div>`;
    }

    focusWindow(appName) {
        if (!this.windows.has(appName)) return;

        const windowElement = this.windows.get(appName);
        windowElement.style.zIndex = ++this.zIndex;
        this.activeWindow = appName;

        // Focus the terminal input if it exists
        const input = windowElement.querySelector('#terminal-input');
        if (input) {
            setTimeout(() => input.focus(), 10);
        }
    }

    closeWindow(appName) {
        if (!this.windows.has(appName)) return;

        const windowElement = this.windows.get(appName);

        // Add fadeout animation
        windowElement.style.animation = 'fadeOut 0.3s ease-out forwards';

        setTimeout(() => {
            if (windowElement.parentNode) {
                windowElement.parentNode.removeChild(windowElement);
            }
            this.windows.delete(appName);

            if (this.activeWindow === appName) {
                this.activeWindow = null;
            }
        }, 300);
    }

    toggleMaximizeWindow(appName) {
        if (!this.windows.has(appName)) return;

        const windowElement = this.windows.get(appName);
        windowElement.classList.toggle('maximized');
    }

    closeActiveWindow() {
        if (this.activeWindow) {
            this.closeWindow(this.activeWindow);
        }
    }
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        to {
            opacity: 0;
            transform: scale(0.8);
        }
    }
`;
document.head.appendChild(style);

// Initialize the macOS interface
document.addEventListener('DOMContentLoaded', () => {
    window.macOSInterface = new MacOSInterface();
});
