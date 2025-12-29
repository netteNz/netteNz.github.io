class TerminalEngine {
    constructor() {
        this.currentPath = '~';
        this.username = 'emanuel';
        this.hostname = 'nettenzOS';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.fileSystem = this.initializeFileSystem();
        console.log('TerminalEngine initialized');
    }

    initializeFileSystem() {
        return {
            '~': {
                type: 'directory',
                contents: {
                    'projects': {
                        type: 'directory',
                        contents: {
                            'web-audio-player': {
                                type: 'directory',
                                url: 'https://nettenz.github.io/web-audio-app',
                                readme: this.getProjectReadme('web-audio-player')
                            },
                            'earthquake-visualization': {
                                type: 'directory',
                                url: 'https://nettenz.github.io/earthquakes_pr.html',
                                readme: this.getProjectReadme('earthquake-visualization')
                            },
                            'door-dashboard': {
                                type: 'directory',
                                url: 'https://github.com/netteNz/DoorDashboard',
                                readme: this.getProjectReadme('door-dashboard')
                            },
                            'veto-system': {
                                type: 'directory',
                                url: 'https://nettenz.github.io/veto-tsd/',
                                readme: this.getProjectReadme('veto-system')
                            }
                        }
                    },
                    'documents': {
                        type: 'directory',
                        contents: {
                            'elr_2025_resume.pdf': { type: 'file' }
                        }
                    },
                    'about.md': {
                        type: 'file',
                        content: () => {
                            const id = 'typing-' + Math.random().toString(36).substr(2, 9);
                            return {
                                type: 'action',
                                message: `<div style="color: var(--terminal-text); line-height: 1.5; font-family: 'Fira Code', monospace;">
<div style="margin-bottom: 12px;">
    <span style="color: var(--terminal-accent); font-weight: bold;">Hi, I'm Emanuel!</span>
</div>
<div style="height: 1.5em; display: flex; align-items: center; margin-bottom: 20px;">
    <span style="color: #fff; margin-right: 10px;">></span>
    <span id="${id}" style="color: #fff; font-weight: bold;"></span><span class="typing-cursor" style="color: #fff; font-weight: bold; animation: blink 1s step-end infinite;">|</span>
</div>
<div style="color: var(--terminal-text-secondary); margin-bottom: 12px;">Type <span style="color: var(--terminal-accent);">ls projects</span> to see my work!</div>
</div>`,
                                action: () => this.runTypingEffect(id, [
                                    "Computer Engineer | Cybersecurity Specialist | Full-Stack Developer",
                                    "Building practical systems and tools",
                                    "Focused on clean architecture and performance"
                                ])
                            };
                        }
                    }
                }
            }
        };
    }

    createTerminal(terminalContent, initialPath = '~') {
        this.currentPath = initialPath;
        this.terminalContent = terminalContent;

        // Set up input event listener
        const input = terminalContent.querySelector('#terminal-input');
        if (input) {
            this.setupInput(input, terminalContent);
        }

        // Setup interactive items (for initial content)
        this.setupInteractiveItems(terminalContent);
    }

    setupInteractiveItems(container) {
        if (!container) return;

        container.querySelectorAll('.terminal-item').forEach(el => {
            // Remove old listeners to avoid duplicates if called multiple times
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);

            newEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = newEl.dataset.name;
                const type = newEl.dataset.type;

                if (type === 'directory') {
                    this.executeCommand(`cd ${name}`, this.terminalContent);
                } else if (type === 'file') {
                    this.executeCommand(`cat ${name}`, this.terminalContent);
                }
            });
        });
    }

    setupInput(input, terminalContent) {
        if (!input) {
            console.error('No input element found');
            return null;
        }

        // Clone input to remove existing listeners
        const newInput = input.cloneNode(true);
        input.replaceWith(newInput);

        console.log('Setting up input listeners for terminal');

        // Handle Enter key and Tab key
        newInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const command = newInput.value.trim();
                console.log('Command entered:', command);
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

        // Add focus handler
        newInput.addEventListener('focus', () => {
            console.log('Terminal input focused');
        });

        return newInput;
    }

    handleTabCompletion(input) {
        const currentInput = input.value;
        const parts = currentInput.split(' ');
        const lastPart = parts[parts.length - 1];

        // Commands list for first word
        const commands = [
            'help', 'ls', 'cd', 'pwd', 'clear', 'whoami', 'cat', 'readme', 'projects', 'exit', 'neofetch', 'matrix'
        ];

        // Directories/files for arguments
        let items = [];

        // If we're typing the command itself (first part)
        if (parts.length === 1) {
            items = commands;
        } else {
            // We're typing an argument, look for files/folders
            let currentDir = this.resolvePath(this.currentPath);

            if (currentDir && currentDir.contents) {
                items = Object.keys(currentDir.contents).map(name => {
                    const item = currentDir.contents[name];
                    return item.type === 'directory' ? `${name}/` : name;
                });

                // Add project commands if applicable
                if (this.currentPath === '~/projects') {
                    items = items.concat(['web-audio-player', 'earthquake-visualization', 'door-dashboard', 'veto-system']);
                }
            }
        }

        // Find matches
        const matches = items.filter(item => item.startsWith(lastPart));

        if (matches.length === 1) {
            // Auto-complete
            parts[parts.length - 1] = matches[0];
            input.value = parts.join(' ');
        }
    }


    executeCommand(command, terminalContent) {
        const [cmd, ...args] = command.toLowerCase().split(' ');

        // Echo command
        this.echoCommand(command, terminalContent);

        // Execute command
        const output = this.runCommand(cmd, args, command);

        // Display output
        if (output !== null) {
            this.displayOutput(output, terminalContent);
        }

        // Create new prompt line instead of scrolling
        this.createNewPromptLine(terminalContent);

        // Enhanced scroll to bottom - use multiple methods for reliability
        this.scrollToBottom(terminalContent);

        // Focus the new input
        const input = terminalContent.querySelector('#terminal-input');
        if (input) {
            setTimeout(() => {
                input.focus();
                // Force scroll again after focus
                this.scrollToBottom(terminalContent);
            }, 50);
        }
    }

    runCommand(cmd, args, fullCommand) {
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
            'exit': () => this.exitCommand(),
            // Project shortcuts
            'web-audio-player': () => this.openProject('web-audio-player'),
            'web-audio': () => this.openProject('web-audio-player'),
            'earthquake-visualization': () => this.openProject('earthquake-visualization'),
            'earthquake': () => this.openProject('earthquake-visualization'),
            'door-dashboard': () => this.openProject('door-dashboard'),
            'dashboard': () => this.openProject('door-dashboard'),
            'veto-system': () => this.openProject('veto-system'),
            'veto': () => this.openProject('veto-system'),
            'neofetch': () => this.neofetchCommand(),
            'matrix': () => this.matrixCommand()
        };

        if (commands[cmd]) {
            return commands[cmd]();
        } else {
            return `<div style="color: var(--terminal-text-secondary);">zsh: command not found: ${cmd}. Type 'help' for available commands.</div>`;
        }
    }

    // Command implementations
    helpCommand() {
        const isProjectsDir = this.currentPath.startsWith('~/projects');

        if (isProjectsDir && this.currentPath !== '~/projects') {
            return `<div style="color: var(--terminal-text-secondary); line-height: 1.4;">Project Commands:
- cat readme: View project README
- ls: List directory contents
- cd ..: Go back to projects directory
- clear: Clear terminal
- exit: Close window

💡 Tip: Use the project name as a command to open it in your browser</div>`;
        }

        return `<div style="color: var(--terminal-text-secondary); line-height: 1.4;">Available commands:
- help: Show this help message
- ls: List directory contents
- cd [directory]: Change directory
- pwd: Show current directory
- whoami: Display user information
- cat [file]: Display file contents
- clear: Clear terminal
- exit: Close terminal
- neofetch: Display system information
- matrix: Enter the matrix
${this.currentPath === '~/projects' ? `
🚀 Project Commands (opens deployed apps):
- web-audio-player (web-audio): Real-time audio visualizer
- earthquake-visualization (earthquake): Puerto Rico earthquake data
- door-dashboard (dashboard): DoorDash analytics
- veto-system (veto): Team decision voting platform` : ''}</div>`;
    }

    resolvePath(pathStr) {
        const pathParts = pathStr.split('/').filter(p => p);
        let currentDir = this.fileSystem['~'];

        // Navigate to current directory structure
        for (const part of pathParts.slice(1)) {
            if (currentDir.contents && currentDir.contents[part]) {
                currentDir = currentDir.contents[part];
            } else {
                return null;
            }
        }
        return currentDir;
    }

    lsCommand(args) {
        const currentDir = this.resolvePath(this.currentPath);

        if (!currentDir || !currentDir.contents) {
            return `<div class="terminal-ls-output">
                <span class="terminal-item terminal-file">README.md</span>
                <span class="terminal-item terminal-dir">src/</span>
                <span class="terminal-item terminal-file">package.json</span>
                <span class="terminal-item terminal-file">deploy.sh</span>
            </div>`;
        }

        const items = Object.keys(currentDir.contents).map(name => {
            const item = currentDir.contents[name];
            return {
                name: name,
                type: item.type,
                display: item.type === 'directory' ? `${name}/` : name
            };
        });

        const id = 'ls-' + Math.random().toString(36).substr(2, 9);
        const itemsHtml = items.map(item => {
            let className = 'terminal-item';
            if (item.type === 'directory') className += ' terminal-dir';
            else if (item.type === 'file') className += ' terminal-file';
            else if (item.type === 'executable') className += ' terminal-exe';

            return `<span class="${className}" data-name="${item.name}" data-type="${item.type}">${item.display}</span>`;
        }).join('');

        return {
            type: 'action',
            message: `<div id="${id}" class="terminal-ls-output">${itemsHtml}</div>`,
            action: () => {
                const container = document.getElementById(id);
                if (!container) return;

                container.querySelectorAll('.terminal-item').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent focusing input immediately if that's bound to container click
                        const name = el.dataset.name;
                        const type = el.dataset.type;

                        if (type === 'directory') {
                            this.executeCommand(`cd ${name}`, this.terminalContent);
                        } else {
                            this.executeCommand(`cat ${name}`, this.terminalContent);
                        }
                    });
                });
            }
        };
    }

    cdCommand(args) {
        if (args.length === 0 || args[0] === '~') {
            this.currentPath = '~';
            this.updatePromptPath();
            return null;
        }

        const targetDir = args[0];

        if (targetDir === '..') {
            const parts = this.currentPath.split('/').filter(p => p);
            if (parts.length > 1) {
                parts.pop();
                this.currentPath = parts.join('/');
            } else {
                this.currentPath = '~';
            }
            this.updatePromptPath();
            return null;
        }

        // Try to navigate to directory
        const newPath = this.currentPath === '~' ? `~/${targetDir}` : `${this.currentPath}/${targetDir}`;

        if (this.directoryExists(newPath)) {
            this.currentPath = newPath;
            this.updatePromptPath();

            // Check if directory has a URL (is a project) and launch it
            const dirNode = this.resolvePath(newPath);
            if (dirNode && dirNode.url) {
                setTimeout(() => {
                    window.open(dirNode.url, '_blank');
                }, 500);
                return `<div style="color: var(--terminal-text-secondary);">Opening project...</div>`;
            }

            return null;
        }

        return `<div style="color: var(--terminal-text-secondary);">cd: no such file or directory: ${targetDir}</div>`;
    }

    pwdCommand() {
        const fullPath = this.currentPath.replace('~', '/Users/emanuel');
        return `<div style="color: var(--terminal-text-secondary);">${fullPath}</div>`;
    }

    whoamiCommand() {
        return `<div style="color: var(--terminal-text-secondary);">Emanuel Lugo Rivera - Full-Stack Engineer & Cybersecurity Specialist</div>`;
    }

    catCommand(args) {
        if (args.length === 0) {
            return `<div style="color: var(--terminal-text-secondary);">cat: missing file operand</div>`;
        }

        const fileName = args[0];

        // Resolve path to find file
        const currentDir = this.resolvePath(this.currentPath);

        // Check if file exists in current directory
        if (currentDir.contents && currentDir.contents[fileName]) {
            const file = currentDir.contents[fileName];
            if (file.type === 'file') {
                if (typeof file.content === 'function') {
                    return file.content();
                }
                if (file.content) {
                    return file.content;
                }
            }
        }

        if (fileName === 'readme' || fileName === 'readme.md') {
            return this.readmeCommand();
        }

        return `<div style="color: var(--terminal-text-secondary);">cat: ${fileName}: No such file or directory</div>`;
    }

    readmeCommand() {
        if (this.currentPath === '~/projects') {
            return `<div style="color: var(--terminal-text-secondary);">Navigate to a specific project directory first. Try: cd web-audio-player</div>`;
        }

        const projectName = this.currentPath.split('/').pop();
        const project = this.getProjectByName(projectName);

        if (project && project.readme) {
            return project.readme;
        }

        return `<div style="color: var(--terminal-text-secondary);">README.md not found for this project.</div>`;
    }

    neofetchCommand() {
        return `<div style="display: flex; gap: 20px; color: var(--terminal-text); font-family: monospace; line-height: 1.2; padding: 10px 0;">
            <div style="color: var(--terminal-accent); white-space: pre; line-height: 1.1; font-weight: bold;">
       /\\
      /  \\
     / /\\ \\
    / /  \\ \\
   / /    \\ \\
  / /      \\ \\
 / /        \\ \\
/_/          \\_\\
            </div>
            <div style="display: flex; flex-direction: column; gap: 0;">
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">emanuel@nettenzOS</span></div>
                <div style="margin: 0;">-----------------</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">OS</span>: nettenzOS (Web Based)</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Host</span>: GitHub Pages</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Kernel</span>: 5.15.0-generic</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Uptime</span>: ${this.getUptime()}</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Shell</span>: zsh 5.8</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Resolution</span>: ${window.innerWidth}x${window.innerHeight}</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Theme</span>: macOS Dark</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Terminal</span>: Custom WebTerm</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">CPU</span>: Neural Engine (Simulated)</div>
                <div style="margin: 0;"><span style="color: var(--terminal-accent);">Memory</span>: 16GB / 32GB</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px; margin-left: 10px;">
                <span style="background: #000; width: 20px; height: 16px; display: inline-block;"></span>
                <span style="background: red; width: 20px; height: 16px; display: inline-block;"></span>
                <span style="background: green; width: 20px; height: 16px; display: inline-block;"></span>
                <span style="background: yellow; width: 20px; height: 16px; display: inline-block;"></span>
                <span style="background: blue; width: 20px; height: 16px; display: inline-block;"></span>
                <span style="background: magenta; width: 20px; height: 16px; display: inline-block;"></span>
                <span style="background: cyan; width: 20px; height: 16px; display: inline-block;"></span>
                <span style="background: white; width: 20px; height: 16px; display: inline-block;"></span>
            </div>
        </div>`;
    }

    getUptime() {
        const now = new Date();
        const start = window.performance.timing.navigationStart;
        const diff = now.getTime() - start;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    matrixCommand() {
        return {
            type: 'action',
            action: () => {
                this.startMatrixEffect();
            },
            message: '<div style="color: var(--terminal-accent);">Wake up, Neo...</div>'
        };
    }

    startMatrixEffect() {
        const terminalContent = this.terminalContent;
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '1000';
        canvas.style.pointerEvents = 'none'; // Click through
        terminalContent.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let width = canvas.width = terminalContent.offsetWidth;
        let height = canvas.height = terminalContent.offsetHeight;

        const cols = Math.floor(width / 20) + 1;
        const ypos = Array(cols).fill(0);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const matrix = () => {
            try {
                // Fade effect
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, width, height);

                const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--terminal-accent').trim() || '#0f0';
                ctx.fillStyle = accentColor;
                ctx.font = '15pt monospace';

                ypos.forEach((y, ind) => {
                    const text = String.fromCharCode(Math.random() * 128);
                    const x = ind * 20;
                    ctx.fillText(text, x, y);
                    if (y > 100 + Math.random() * 10000) ypos[ind] = 0;
                    else ypos[ind] = y + 20;
                });
            } catch (e) {
                // Handle resize/cleanup
            }
        };

        const interval = setInterval(matrix, 50);

        // Stop on keypress or click
        const cleanup = () => {
            clearInterval(interval);
            canvas.remove();
            document.removeEventListener('keydown', cleanup);
            document.removeEventListener('click', cleanup);
        };

        // Delay attaching cleanup to avoid immediate trigger
        setTimeout(() => {
            document.addEventListener('keydown', cleanup);
            document.addEventListener('click', cleanup);
        }, 500);
    }

    runTypingEffect(elementId, phrases) {
        const element = document.getElementById(elementId);
        if (!element) return;

        let phraseIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        const type = () => {
            const currentPhrase = phrases[phraseIndex % phrases.length];

            if (isDeleting) {
                element.innerText = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
            } else {
                element.innerText = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
            }

            let typeSpeed = 50;
            if (isDeleting) typeSpeed /= 2;

            if (!isDeleting && charIndex === currentPhrase.length) {
                typeSpeed = 2000; // Pause at end
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex++;
                typeSpeed = 500; // Pause before next
            }

            setTimeout(type, typeSpeed);
        };

        type();
    }

    projectsCommand() {
        return {
            type: 'action',
            action: () => {
                if (window.macOS) {
                    window.macOS.openApp('projects');
                }
            },
            message: `<div style="color: var(--terminal-text-secondary);">Opening projects directory...</div>`
        };
    }

    openProject(projectName) {
        const project = this.getProjectByName(projectName);

        if (project && project.url) {
            setTimeout(() => {
                window.open(project.url, '_blank');
            }, 500);
            return `<div style="color: var(--terminal-text-secondary);">Opening ${projectName}...</div>`;
        }

        return `<div style="color: var(--terminal-text-secondary);">Project not found: ${projectName}</div>`;
    }

    clearCommand() {
        return { type: 'clear' };
    }

    exitCommand() {
        return { type: 'exit' };
    }

    scrollToBottom(terminalContent) {
        // Use scrollIntoView on the input line if it exists
        const inputLine = terminalContent.querySelector('.terminal-input-line');
        if (inputLine) {
            inputLine.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            terminalContent.scrollTop = terminalContent.scrollHeight;
        }
    }

    createNewPromptLine(terminalContent) {
        // Remove old input line
        const oldInputLine = terminalContent.querySelector('.terminal-input-line');
        if (oldInputLine) {
            oldInputLine.remove();
        }

        // Create new input line
        const newInputLine = document.createElement('div');
        newInputLine.className = 'terminal-input-line';
        newInputLine.innerHTML = `
            <span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">${this.currentPath}</span>$ 
            <input type="text" id="terminal-input" class="terminal-input bg-transparent outline-none flex-1 ml-1" style="color: var(--terminal-accent); caret-color: var(--terminal-accent);" autofocus>
        `;

        // Append to terminal content
        terminalContent.appendChild(newInputLine);

        // Scroll immediately using scrollIntoView
        // Use timeout to ensure DOM is updated and layout is calculated
        setTimeout(() => {
            newInputLine.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 10);

        // Setup input event listeners
        const input = newInputLine.querySelector('#terminal-input');
        if (input) {
            this.setupInput(input, terminalContent);
        }
    }

    displayOutput(output, terminalContent) {
        // Handle special output types
        if (typeof output === 'object') {
            if (output.type === 'clear') {
                this.clearTerminalContent(terminalContent);
                return;
            } else if (output.type === 'exit') {
                const windowElement = terminalContent.closest('.window');
                if (windowElement && window.macOS) {
                    window.macOS.closeWindow(windowElement.dataset.app);
                }
                return;
            } else if (output.type === 'action') {
                if (output.message) {
                    const outputDiv = document.createElement('div');
                    outputDiv.className = 'terminal-output';
                    outputDiv.innerHTML = output.message;

                    const inputContainer = terminalContent.querySelector('.terminal-input-line');
                    if (inputContainer) {
                        inputContainer.parentNode.insertBefore(outputDiv, inputContainer);
                    } else {
                        terminalContent.appendChild(outputDiv);
                    }

                    // Scroll after adding output
                    // terminalContent.scrollTop = terminalContent.scrollHeight; // Removed for standard scrollIntoView flow
                }
                if (output.action) {
                    output.action();
                }
                return;
            }
        }

        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-output';
        outputDiv.innerHTML = output;

        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(outputDiv, inputContainer);
        } else {
            terminalContent.appendChild(outputDiv);
        }

        // Scroll after adding output
        // terminalContent.scrollTop = terminalContent.scrollHeight; // Removed for standard scrollIntoView flow
    }

    clearTerminalContent(terminalContent) {
        const isProjectsDir = this.currentPath.startsWith('~/projects');
        const isTerminal = this.currentPath === '~';

        // Clear all content
        terminalContent.innerHTML = '';

        if (isProjectsDir) {
            // For projects terminal, show initial ls output
            const lsOutput = document.createElement('div');
            lsOutput.className = 'terminal-line';
            lsOutput.innerHTML = `<span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">${this.currentPath}</span>$ ls`;
            terminalContent.appendChild(lsOutput);

            const lsResult = document.createElement('div');
            // Remove margin-bottom to rely on flex gap or handle it via CSS if needed
            // lsResult.className = 'terminal-output'; 
            // Using terminal-ls-output class directly which is a flex container
            lsResult.innerHTML = `<div class="terminal-ls-output">
                <span class="terminal-item terminal-dir" data-name="web-audio-player" data-type="directory">web-audio-player/</span>
                <span class="terminal-item terminal-dir" data-name="earthquake-visualization" data-type="directory">earthquake-visualization/</span>
                <span class="terminal-item terminal-dir" data-name="door-dashboard" data-type="directory">door-dashboard/</span>
                <span class="terminal-item terminal-dir" data-name="veto-system" data-type="directory">veto-system/</span>
            </div>`;
            terminalContent.appendChild(lsResult);

            // Re-attach listeners for the new items
            this.setupInteractiveItems(lsResult);

            const helpHint = document.createElement('div');
            helpHint.style.marginBottom = '4px';
            helpHint.innerHTML = `<span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">${this.currentPath}</span>$ echo "Type 'help' for available commands"`;
            terminalContent.appendChild(helpHint);

            const helpHintOutput = document.createElement('div');
            helpHintOutput.style.marginBottom = '8px';
            helpHintOutput.style.color = 'var(--terminal-text-secondary)';
            helpHintOutput.textContent = "Type 'help' for available commands";
            terminalContent.appendChild(helpHintOutput);
        } else if (isTerminal) {
            // For main terminal, show welcome commands

            // 1. whoami
            const cmd1 = `<div style="margin-bottom: 4px;"><span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">~</span>$ whoami</div>`;
            const out1 = `<div style="margin-bottom: 8px; color: var(--terminal-text-secondary);">Emanuel Lugo Rivera - Full-Stack Engineer & Cybersecurity Specialist</div>`;

            // 2. cat ~/.skills
            const cmd2 = `<div style="margin-bottom: 4px;"><span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">~</span>$ cat ~/.skills</div>`;
            const out2 = `<div style="margin-bottom: 8px; color: var(--terminal-text-secondary); white-space: pre-line;">Frontend: React, TypeScript, TailwindCSS, Vite
Backend: Python, Node.js, Flask, Django
Database: PostgreSQL, MongoDB
Security: Penetration Testing, Vulnerability Assessment
Audio: Web Audio API, Real-time Visualization</div>`;

            // 3. ls ~/projects
            const cmd3 = `<div style="margin-bottom: 4px;"><span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">~</span>$ ls ~/projects</div>`;
            const out3 = `<div style="margin-bottom: 8px;">
                <div class="terminal-ls-output">
                    <span class="terminal-item terminal-dir" data-name="web-audio-player" data-type="directory">web-audio-player/</span>
                    <span class="terminal-item terminal-dir" data-name="earthquake-viz" data-type="directory">earthquake-viz/</span>
                    <span class="terminal-item terminal-dir" data-name="door-dashboard" data-type="directory">door-dashboard/</span>
                    <span class="terminal-item terminal-dir" data-name="veto-system" data-type="directory">veto-system/</span>
                </div>
            </div>`;

            // 4. echo help
            const cmd4 = `<div style="margin-bottom: 4px;"><span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">~</span>$ echo "Type 'help' for available commands"</div>`;
            const out4 = `<div style="margin-bottom: 8px; color: var(--terminal-text-secondary);">Type 'help' for available commands</div>`;

            terminalContent.innerHTML = cmd1 + out1 + cmd2 + out2 + cmd3 + out3 + cmd4 + out4;

            // Setup interactivity for the new items
            this.setupInteractiveItems(terminalContent);
        }

        // Create fresh prompt line
        this.createNewPromptLine(terminalContent);

        // Ensure scroll to bottom after clear
        this.scrollToBottom(terminalContent);
    }

    // Helper methods
    directoryExists(path) {
        const node = this.resolvePath(path);
        return node && node.type === 'directory';
    }

    getProjectByName(name) {
        const projects = this.fileSystem['~'].contents['projects'].contents;
        return projects[name];
    }

    updatePromptPath() {
        if (this.terminalContent) {
            const promptPath = this.terminalContent.querySelector('.terminal-input-line .terminal-path');
            if (promptPath) {
                promptPath.textContent = this.currentPath;
            }
        }
    }

    echoCommand(command, terminalContent) {
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `<span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">${this.currentPath}</span>$ ${this.escapeHtml(command)}`;

        // Insert before input line (which will be removed)
        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(commandLine, inputContainer);
        } else {
            terminalContent.appendChild(commandLine);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getProjectReadme(projectName) {
        const readmes = {
            'web-audio-player': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">🎵 Web Audio Player</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.4;">
Real-time audio visualizer built with Web Audio API
- Live frequency spectrum analysis
- LUFS loudness metering
- Waveform visualization
- React + TypeScript architecture

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://nettenz.github.io/web-audio-app
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/web-audio-app
</div>`,
            'earthquake-visualization': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">🌍 Earthquake Visualization</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.4;">
Interactive map showing Puerto Rico earthquake data
- Real-time seismic data visualization
- Time-based filtering and analysis
- Geographic clustering of events
- D3.js + Leaflet implementation

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://nettenz.github.io/earthquakes_pr.html
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/earthquakes_pr
</div>`,
            'door-dashboard': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">📊 DoorDash Analytics Dashboard</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.4;">
Comprehensive analytics dashboard for delivery metrics
- Revenue and order tracking
- Driver performance analytics
- Customer satisfaction metrics
- Interactive charts and KPIs

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://github.com/netteNz/DoorDashboard
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/DoorDashboard
</div>`,
            'veto-system': `<div style="color: var(--terminal-accent); font-weight: bold; margin-bottom: 12px;">🗳️ Veto Voting System</div>
<div style="color: var(--terminal-text-secondary); line-height: 1.4;">
Team decision-making platform with veto capabilities
- Democratic voting with veto power
- Real-time decision tracking
- Team consensus building tools
- TypeScript + React implementation

<span style="color: var(--terminal-accent);">🔗 Live Demo:</span> https://nettenz.github.io/veto-tsd/
<span style="color: var(--terminal-accent);">📂 Repository:</span> https://github.com/netteNz/veto-tsd
</div>`
        };
        return readmes[projectName] || '';
    }
}

// Make TerminalEngine globally available
window.TerminalEngine = TerminalEngine;

// Log when script loads
console.log('TerminalEngine class loaded');

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerminalEngine;
}