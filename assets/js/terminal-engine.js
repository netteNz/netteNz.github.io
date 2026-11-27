// POSIX-ish shell emulator. Project entries come from window.PROJECTS (projects-data.js);
// anything from that data that ends up in HTML goes through escapeHtml / safeUrl first.

// Short aliases for project shortcuts. Only registered when the slug exists in PROJECTS.
const PROJECT_ALIASES = {
    'web-audio': 'web-audio-player',
    'earthquake': 'earthquake-visualization',
    'rl-trading': 'rl-trading-bot',
    'veto': 'veto-system',
    'macropad': 'macropad-profiles',
    'oled': 'oled-bonnet'
};

const ABOUT_PHRASES = [
    'AI software development engineer',
    'Agentic AI systems',
    'Embedded and hardware projects',
    'Reinforcement learning for trading'
];

class TerminalEngine {
    constructor() {
        this.currentPath = '~';
        this.username = 'emanuel';
        this.hostname = 'nettenzOS';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
        this.fileSystem = this.initializeFileSystem();
    }

    initializeFileSystem() {
        const projectDirs = {};
        this.projects.forEach(project => {
            projectDirs[project.slug] = {
                type: 'directory',
                project,
                contents: {
                    'README.md': { type: 'file', content: () => this.renderReadme(project) }
                }
            };
        });

        return {
            '~': {
                type: 'directory',
                contents: {
                    'projects': { type: 'directory', contents: projectDirs },
                    'documents': {
                        type: 'directory',
                        contents: {
                            'elr_2025_resume.pdf': { type: 'file' }
                        }
                    },
                    'about.md': {
                        type: 'file',
                        content: () => {
                            const id = 'typing-' + Math.random().toString(36).slice(2, 11);
                            return {
                                type: 'action',
                                message: this.aboutBlock(id),
                                action: () => this.runTypingEffect(id, ABOUT_PHRASES)
                            };
                        }
                    }
                }
            }
        };
    }

    aboutBlock(id) {
        return `<div class="t-about">
<div class="t-accent t-strong">Hi, I'm Emanuel.</div>
<div class="t-typing-line"><span>&gt;</span> <span id="${id}" class="t-strong"></span><span class="typing-cursor">|</span></div>
<div>Type <span class="t-accent">ls projects</span> to see my work.</div>
</div>`;
    }

    createTerminal(terminalContent, initialPath = '~') {
        this.currentPath = initialPath;
        this.terminalContent = terminalContent;

        const input = terminalContent.querySelector('.terminal-input');
        if (input) {
            this.setupInput(input, terminalContent);
        }

        this.setupInteractiveItems(terminalContent);
    }

    setupInteractiveItems(container) {
        if (!container) return;

        container.querySelectorAll('.terminal-item').forEach(el => {
            // Replace node to drop any listeners attached by a previous call
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
            newEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activateItem(newEl.dataset.name, newEl.dataset.type);
            });
        });
    }

    activateItem(name, type) {
        if (type === 'directory') {
            this.executeCommand(`cd ${name}`, this.terminalContent);
            // After a successful cd into a project directory, show its README window too
            const node = this.currentPath.startsWith('~/projects/')
                ? this.getProjectByName(this.currentPath.split('/').pop())
                : null;
            if (node && node.project) window.macOS?.openReadme?.(node.project.slug);
        } else {
            this.executeCommand(`cat ${name}`, this.terminalContent);
        }
    }

    setupInput(input, terminalContent) {
        if (!input) return null;

        // Clone to remove existing listeners
        const newInput = input.cloneNode(true);
        input.replaceWith(newInput);

        newInput.addEventListener('keydown', (e) => {
            // Signature meter reacts to typing (no-op under reduced motion)
            window.macOS?.bumpMeter?.(e.key === 'Enter' ? 7 : 3 + Math.floor(Math.random() * 3));

            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const command = newInput.value.trim();
                if (command) {
                    this.commandHistory.push(command);
                    this.historyIndex = this.commandHistory.length;
                    this.executeCommand(command, terminalContent);
                    newInput.value = '';
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    newInput.value = this.commandHistory[this.historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    newInput.value = this.commandHistory[this.historyIndex];
                } else {
                    this.historyIndex = this.commandHistory.length;
                    newInput.value = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.handleTabCompletion(newInput);
            }
        });

        return newInput;
    }

    commandNames() {
        return ['help', 'ls', 'cd', 'pwd', 'clear', 'whoami', 'cat', 'readme', 'projects', 'work',
            'exit', 'neofetch', 'matrix'];
    }

    handleTabCompletion(input) {
        const parts = input.value.split(' ');
        const lastPart = parts[parts.length - 1];
        let items = [];

        if (parts.length === 1) {
            items = this.commandNames().concat(this.projects.map(p => p.slug));
        } else {
            const currentDir = this.resolvePath(this.currentPath);
            if (currentDir && currentDir.contents) {
                items = Object.keys(currentDir.contents).map(name =>
                    currentDir.contents[name].type === 'directory' ? `${name}/` : name);
            }
        }

        const matches = items.filter(item => item.startsWith(lastPart));
        if (matches.length === 1) {
            parts[parts.length - 1] = matches[0];
            input.value = parts.join(' ');
        }
    }

    executeCommand(command, terminalContent) {
        this.echoCommand(command, terminalContent);

        // Support simple `a && b` chaining (kept for typed commands)
        const steps = command.split('&&').map(s => s.trim()).filter(Boolean);
        for (const step of steps) {
            const [cmd, ...args] = step.toLowerCase().split(/\s+/);
            const output = this.runCommand(cmd, args);
            if (output !== null && output !== undefined) {
                this.displayOutput(output, terminalContent);
                if (typeof output === 'object' && output.type === 'exit') return;
            }
        }

        this.createNewPromptLine(terminalContent);
        this.scrollToBottom(terminalContent);

        const input = terminalContent.querySelector('.terminal-input');
        if (input) {
            setTimeout(() => {
                this.scrollToBottom(terminalContent);
                // Don't steal focus if the command brought another window to the front
                // (e.g. a project click that opened the README window).
                const win = terminalContent.closest('.window');
                if (window.macOS && win && window.macOS.activeWindow !== win.dataset.app) return;
                input.focus({ preventScroll: true });
            }, 50);
        }
    }

    runCommand(cmd, args) {
        const commands = {
            'help': () => this.helpCommand(),
            'ls': () => this.lsCommand(args),
            'cd': () => this.cdCommand(args),
            'pwd': () => this.pwdCommand(),
            'clear': () => this.clearCommand(),
            'whoami': () => this.whoamiCommand(),
            'cat': () => this.catCommand(args),
            'readme': () => this.readmeCommand(),
            'projects': () => this.projectsCommand(),
            'work': () => this.projectsCommand(),
            'exit': () => this.exitCommand(),
            'neofetch': () => this.neofetchCommand(),
            'matrix': () => this.matrixCommand()
        };

        // Project shortcuts: slug and alias open the project in a new tab
        this.projects.forEach(p => {
            commands[p.slug] = () => this.openProject(p.slug);
        });
        Object.entries(PROJECT_ALIASES).forEach(([alias, slug]) => {
            if (this.getProjectByName(slug)) commands[alias] = () => this.openProject(slug);
        });

        if (Object.prototype.hasOwnProperty.call(commands, cmd)) {
            return commands[cmd]();
        }
        return `<div class="t-error">zsh: command not found: ${this.escapeHtml(cmd)}. Type 'help' for available commands.</div>`;
    }

    // ---- Command implementations ----

    helpCommand() {
        const inProjectDir = this.currentPath.startsWith('~/projects/');

        if (inProjectDir) {
            return `<div class="t-muted">Project commands:
- cat README.md: show the project README
- ls: list directory contents
- cd ..: back to projects
- clear: clear the terminal
- exit: close the window

Type the project name to open it in a new tab.</div>`;
        }

        const projectList = this.currentPath === '~/projects'
            ? '\n\nProject shortcuts (open in a new tab):\n' + this.projects
                .map(p => `- ${this.escapeHtml(p.slug)}: ${this.escapeHtml(p.summary)}`)
                .join('\n')
            : '';

        return `<div class="t-muted">Available commands:
- help: show this help message
- ls: list directory contents
- cd [directory]: change directory
- pwd: show current directory
- whoami: display user information
- cat [file]: display file contents
- projects: open the Work window
- clear: clear the terminal
- exit: close the terminal
- neofetch: display system information
- matrix: enter the matrix${projectList}</div>`;
    }

    resolvePath(pathStr) {
        if (!pathStr) return null;

        const pathParts = pathStr.split('/').filter(p => p);
        if (pathParts.length === 0) return this.fileSystem['~'];

        let currentDir = this.fileSystem['~'];
        const startIndex = pathParts[0] === '~' ? 1 : 0;

        for (let i = startIndex; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (currentDir.contents && Object.prototype.hasOwnProperty.call(currentDir.contents, part)) {
                currentDir = currentDir.contents[part];
            } else {
                return null;
            }
        }
        return currentDir;
    }

    lsCommand(args) {
        let target = this.currentPath;
        if (args && args[0]) {
            target = this.joinPath(this.currentPath, args[0]);
        }
        const dir = this.resolvePath(target);

        if (!dir || !dir.contents) {
            return `<div class="t-error">ls: ${this.escapeHtml(args && args[0] ? args[0] : target)}: No such file or directory</div>`;
        }

        // Clicking an item should resolve relative to the listed directory
        const prefix = target === this.currentPath ? '' : `${args[0].replace(/\/+$/, '')}/`;

        const id = 'ls-' + Math.random().toString(36).slice(2, 11);
        const itemsHtml = Object.keys(dir.contents).map(name => {
            const item = dir.contents[name];
            let className = 'terminal-item';
            if (item.type === 'directory') className += ' terminal-dir';
            else if (item.type === 'file') className += ' terminal-file';
            else if (item.type === 'executable') className += ' terminal-exe';
            const display = item.type === 'directory' ? `${name}/` : name;
            return `<span class="${className}" data-name="${this.escapeHtml(prefix + name)}" data-type="${this.escapeHtml(item.type)}">${this.escapeHtml(display)}</span>`;
        }).join('');

        return {
            type: 'action',
            message: `<div id="${id}" class="terminal-ls-output">${itemsHtml}</div>`,
            action: () => {
                const container = document.getElementById(id);
                if (!container) return;
                container.querySelectorAll('.terminal-item').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.activateItem(el.dataset.name, el.dataset.type);
                    });
                });
            }
        };
    }

    joinPath(base, target) {
        if (target === '~' || target.startsWith('~/')) return target.replace(/\/+$/, '');
        const parts = base.split('/').filter(Boolean);
        target.split('/').filter(Boolean).forEach(seg => {
            if (seg === '..') {
                if (parts.length > 1) parts.pop();
            } else if (seg !== '.') {
                parts.push(seg);
            }
        });
        return parts.join('/') || '~';
    }

    cdCommand(args) {
        if (args.length === 0 || args[0] === '~') {
            this.currentPath = '~';
            this.updatePromptPath();
            return null;
        }

        const newPath = this.joinPath(this.currentPath, args[0]);
        if (this.directoryExists(newPath)) {
            this.currentPath = newPath;
            this.updatePromptPath();
            return null;
        }

        return `<div class="t-error">cd: no such file or directory: ${this.escapeHtml(args[0])}</div>`;
    }

    pwdCommand() {
        const fullPath = this.currentPath.replace('~', '/Users/emanuel');
        return `<div class="t-muted">${this.escapeHtml(fullPath)}</div>`;
    }

    whoamiCommand() {
        return `<div class="t-muted">Emanuel Lugo Rivera, AI software development engineer. B.S. in Computer Engineering (cybersecurity), writing code since 2017.</div>`;
    }

    catCommand(args) {
        if (args.length === 0) {
            return `<div class="t-muted">cat: missing file operand</div>`;
        }

        // Allow `cat dir/file` by resolving the directory part first
        const slash = args[0].lastIndexOf('/');
        const fileName = slash >= 0 ? args[0].slice(slash + 1) : args[0];
        const dirPath = slash >= 0 ? this.joinPath(this.currentPath, args[0].slice(0, slash) || '~') : this.currentPath;
        const currentDir = this.resolvePath(dirPath);

        // Commands are lowercased, so match file names case-insensitively
        if (currentDir && currentDir.contents) {
            const key = Object.keys(currentDir.contents).find(k => k.toLowerCase() === fileName);
            const file = key && currentDir.contents[key];
            if (file && file.type === 'file') {
                if (currentDir.project && file === currentDir.contents['README.md']) {
                    // Keep the short terminal summary, then open the full GitHub README window
                    const slug = currentDir.project.slug;
                    return {
                        type: 'action',
                        message: `${file.content()}<div class="t-muted">Opening README\u2026</div>`,
                        action: () => window.macOS?.openReadme?.(slug)
                    };
                }
                if (typeof file.content === 'function') return file.content();
                if (file.content) return file.content;
            }
        }

        if (fileName === 'readme' || fileName === 'readme.md') {
            return this.readmeCommand();
        }

        return `<div class="t-error">cat: ${this.escapeHtml(fileName)}: No such file or directory</div>`;
    }

    readmeCommand() {
        if (this.currentPath === '~/projects') {
            const first = this.projects[0] ? this.projects[0].slug : '';
            return `<div class="t-muted">Navigate to a project directory first. Try: cd ${this.escapeHtml(first)}</div>`;
        }

        const node = this.getProjectByName(this.currentPath.split('/').pop());
        if (node && node.project) {
            return this.renderReadme(node.project);
        }

        return `<div class="t-muted">README.md not found for this directory.</div>`;
    }

    renderReadme(project) {
        const esc = (s) => this.escapeHtml(s);
        const bullets = (project.readme || []).map(line => `- ${esc(line)}`).join('\n');
        const stack = (project.stack || []).length ? `\n\nStack: ${project.stack.map(esc).join(', ')}` : '';
        const links = [];
        const live = this.safeUrl(project.live);
        const repo = this.safeUrl(project.repo);
        if (live) links.push(`<span class="t-accent">Live demo:</span> <a href="${esc(live)}" target="_blank" rel="noopener noreferrer">${esc(live)}</a>`);
        if (repo) links.push(`<span class="t-accent">Source:</span> <a href="${esc(repo)}" target="_blank" rel="noopener noreferrer">${esc(repo)}</a>`);

        return `<div class="t-readme"><div class="t-accent t-strong"># ${esc(project.name)}</div>
<div class="t-muted">${esc(project.summary)}${bullets ? '\n\n' + bullets : ''}${stack}${links.length ? '\n\n' + links.join('\n') : ''}</div></div>`;
    }

    neofetchCommand() {
        return `<div class="t-neofetch">
            <div class="t-accent t-strong t-ascii">
       /\\
      /  \\
     / /\\ \\
    / /  \\ \\
   / /    \\ \\
  / /      \\ \\
 / /        \\ \\
/_/          \\_\\
            </div>
            <div class="t-neofetch-info">
                <div><span class="t-accent">emanuel@nettenzOS</span></div>
                <div>-----------------</div>
                <div><span class="t-accent">OS</span>: nettenzOS (Web Based)</div>
                <div><span class="t-accent">Host</span>: GitHub Pages</div>
                <div><span class="t-accent">Kernel</span>: 5.15.0-generic</div>
                <div><span class="t-accent">Uptime</span>: ${this.getUptime()}</div>
                <div><span class="t-accent">Shell</span>: zsh 5.8</div>
                <div><span class="t-accent">Resolution</span>: ${window.innerWidth}x${window.innerHeight}</div>
                <div><span class="t-accent">Theme</span>: Catppuccin Mocha on GitHub Dark</div>
                <div><span class="t-accent">Terminal</span>: Custom WebTerm</div>
                <div><span class="t-accent">Projects</span>: ${this.projects.length}</div>
            </div>
        </div>`;
    }

    getUptime() {
        const diff = performance.now();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    matrixCommand() {
        return {
            type: 'action',
            action: () => this.startMatrixEffect(),
            message: '<div class="t-ok">Wake up, Neo...</div>'
        };
    }

    startMatrixEffect() {
        const terminalContent = this.terminalContent;
        const canvas = document.createElement('canvas');
        canvas.className = 't-matrix';
        terminalContent.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const width = canvas.width = terminalContent.offsetWidth;
        const height = canvas.height = terminalContent.offsetHeight;
        const cols = Math.floor(width / 20) + 1;
        const ypos = Array(cols).fill(0);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--ctp-green').trim() || '#a6e3a1';
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--console').trim() || '#0d1117';

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        const frame = () => {
            // The window can close before the click/keydown listeners attach (500ms below),
            // so also stop as soon as the canvas is no longer in the document.
            if (!canvas.isConnected) { cleanup(); return; }
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;
            ctx.fillStyle = accent;
            ctx.font = '15pt monospace';
            ypos.forEach((y, ind) => {
                ctx.fillText(String.fromCharCode(Math.random() * 128), ind * 20, y);
                ypos[ind] = y > 100 + Math.random() * 10000 ? 0 : y + 20;
            });
        };

        const interval = setInterval(frame, 50);
        const cleanup = () => {
            clearInterval(interval);
            canvas.remove();
            document.removeEventListener('keydown', cleanup);
            document.removeEventListener('click', cleanup);
        };

        setTimeout(() => {
            document.addEventListener('keydown', cleanup);
            document.addEventListener('click', cleanup);
        }, 500);
    }

    runTypingEffect(elementId, phrases) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Reduced motion / low-end GPU: show the first phrase statically
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            || document.documentElement.classList.contains('software-rendering');
        if (reduced) {
            element.textContent = phrases[0];
            return;
        }

        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        const type = () => {
            if (!element.isConnected) return; // window was closed
            const currentPhrase = phrases[phraseIndex % phrases.length];

            if (isDeleting) {
                element.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
            } else {
                element.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
            }

            let typeSpeed = isDeleting ? 25 : 50;
            if (!isDeleting && charIndex === currentPhrase.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex++;
                typeSpeed = 500;
            }

            setTimeout(type, typeSpeed);
        };

        type();
    }

    projectsCommand() {
        return {
            type: 'action',
            action: () => window.macOS?.openApp('projects'),
            message: `<div class="t-muted">Opening the Work window...</div>`
        };
    }

    openProject(slug) {
        const node = this.getProjectByName(slug);
        const url = node && node.project && this.safeUrl(node.project.live || node.project.repo);

        if (url) {
            // Synchronous, so it stays inside the user gesture and popup blockers (Safari) allow it
            window.open(url, '_blank', 'noopener,noreferrer');
            return `<div class="t-muted">Opening ${this.escapeHtml(slug)}...</div>`;
        }
        return `<div class="t-error">Project not found: ${this.escapeHtml(slug)}</div>`;
    }

    clearCommand() {
        return { type: 'clear' };
    }

    exitCommand() {
        return { type: 'exit' };
    }

    scrollToBottom(terminalContent) {
        const inputLine = terminalContent.querySelector('.terminal-input-line');
        if (inputLine) {
            inputLine.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            terminalContent.scrollTop = terminalContent.scrollHeight;
        }
    }

    promptHtml() {
        return `<span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">${this.escapeHtml(this.currentPath)}</span>$`;
    }

    createNewPromptLine(terminalContent) {
        const oldInputLine = terminalContent.querySelector('.terminal-input-line');
        if (oldInputLine) oldInputLine.remove();

        const newInputLine = document.createElement('div');
        newInputLine.className = 'terminal-input-line';
        newInputLine.innerHTML = `${this.promptHtml()}
            <input type="text" class="terminal-input" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false">`;

        terminalContent.appendChild(newInputLine);
        setTimeout(() => newInputLine.scrollIntoView({ behavior: 'smooth', block: 'end' }), 10);

        const input = newInputLine.querySelector('.terminal-input');
        if (input) this.setupInput(input, terminalContent);
    }

    insertOutput(html, terminalContent) {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-output';
        outputDiv.innerHTML = html;

        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(outputDiv, inputContainer);
        } else {
            terminalContent.appendChild(outputDiv);
        }
    }

    displayOutput(output, terminalContent) {
        if (typeof output === 'object') {
            if (output.type === 'clear') {
                this.clearTerminalContent(terminalContent);
            } else if (output.type === 'exit') {
                const windowElement = terminalContent.closest('.window');
                if (windowElement && window.macOS) {
                    window.macOS.closeWindow(windowElement.dataset.app);
                }
            } else if (output.type === 'action') {
                if (output.message) this.insertOutput(output.message, terminalContent);
                if (output.action) output.action();
            }
            return;
        }
        this.insertOutput(output, terminalContent);
    }

    clearTerminalContent(terminalContent) {
        terminalContent.innerHTML = '';
    }

    // ---- Helpers ----

    directoryExists(path) {
        const node = this.resolvePath(path);
        return !!node && node.type === 'directory';
    }

    getProjectByName(name) {
        const projects = this.fileSystem['~'].contents['projects'].contents;
        return Object.prototype.hasOwnProperty.call(projects, name) ? projects[name] : undefined;
    }

    updatePromptPath() {
        if (this.terminalContent) {
            const promptPath = this.terminalContent.querySelector('.terminal-input-line .terminal-path');
            if (promptPath) promptPath.textContent = this.currentPath;
        }
    }

    echoCommand(command, terminalContent) {
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `${this.promptHtml()} ${this.escapeHtml(command)}`;

        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(commandLine, inputContainer);
        } else {
            terminalContent.appendChild(commandLine);
        }
    }

    escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Only allow http(s) links out of project data
    safeUrl(url) {
        if (!url) return '';
        try {
            const parsed = new URL(url, window.location.href);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : '';
        } catch {
            return '';
        }
    }
}

window.TerminalEngine = TerminalEngine;
window.TERMINAL_ABOUT_PHRASES = ABOUT_PHRASES;
