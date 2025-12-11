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
                                url: 'https://nettenz.github.io/DoorDashboard',
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
                    'about.md': { type: 'file' }
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

        // Handle Enter key
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
            }
        });

        // Add focus handler
        newInput.addEventListener('focus', () => {
            console.log('Terminal input focused');
        });

        return newInput;
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
            'veto': () => this.openProject('veto-system')
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
            return `<div style="color: var(--terminal-text-secondary); line-height: 1.6;">Project Commands:
- cat readme: View project README
- ls: List directory contents
- cd ..: Go back to projects directory
- clear: Clear terminal
- exit: Close window

💡 Tip: Use the project name as a command to open it in your browser</div>`;
        }

        return `<div style="color: var(--terminal-text-secondary); line-height: 1.6;">Available commands:
- help: Show this help message
- ls: List directory contents
- cd [directory]: Change directory
- pwd: Show current directory
- whoami: Display user information
- cat [file]: Display file contents
- clear: Clear terminal
- exit: Close terminal
${this.currentPath === '~/projects' ? `
🚀 Project Commands (opens deployed apps):
- web-audio-player (web-audio): Real-time audio visualizer
- earthquake-visualization (earthquake): Puerto Rico earthquake data
- door-dashboard (dashboard): DoorDash analytics
- veto-system (veto): Team decision voting platform` : ''}</div>`;
    }

    lsCommand(args) {
        const pathParts = this.currentPath.split('/').filter(p => p);
        let currentDir = this.fileSystem['~'];

        // Navigate to current directory
        for (const part of pathParts.slice(1)) {
            if (currentDir.contents && currentDir.contents[part]) {
                currentDir = currentDir.contents[part];
            }
        }

        if (!currentDir.contents) {
            return `<div style="color: var(--terminal-accent);">README.md&nbsp;&nbsp;&nbsp;&nbsp;src/&nbsp;&nbsp;&nbsp;&nbsp;package.json&nbsp;&nbsp;&nbsp;&nbsp;deploy.sh</div>`;
        }

        const items = Object.keys(currentDir.contents).map(name => {
            const item = currentDir.contents[name];
            return item.type === 'directory' ? `${name}/` : name;
        });

        return `<div style="color: var(--terminal-accent);">${items.join('&nbsp;&nbsp;&nbsp;&nbsp;')}</div>`;
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

        if (args[0] === 'readme' || args[0] === 'readme.md') {
            return this.readmeCommand();
        }

        return `<div style="color: var(--terminal-text-secondary);">cat: ${args[0]}: No such file or directory</div>`;
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
        // Multiple scroll attempts for better reliability
        
        // Immediate scroll
        terminalContent.scrollTop = terminalContent.scrollHeight;
        
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
            terminalContent.scrollTop = terminalContent.scrollHeight;
            
            // Double RAF for extra reliability
            requestAnimationFrame(() => {
                terminalContent.scrollTop = terminalContent.scrollHeight;
            });
        });
        
        // Backup scroll after a small delay
        setTimeout(() => {
            terminalContent.scrollTop = terminalContent.scrollHeight;
        }, 100);
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

        // Scroll immediately after appending
        terminalContent.scrollTop = terminalContent.scrollHeight;

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
                    outputDiv.style.marginBottom = '8px';
                    outputDiv.innerHTML = output.message;
                    
                    const inputContainer = terminalContent.querySelector('.terminal-input-line');
                    if (inputContainer) {
                        inputContainer.parentNode.insertBefore(outputDiv, inputContainer);
                    } else {
                        terminalContent.appendChild(outputDiv);
                    }
                    
                    // Scroll after adding output
                    terminalContent.scrollTop = terminalContent.scrollHeight;
                }
                if (output.action) {
                    output.action();
                }
                return;
            }
        }

        const outputDiv = document.createElement('div');
        outputDiv.className = 'terminal-output';
        outputDiv.style.marginBottom = '8px';
        outputDiv.innerHTML = output;

        const inputContainer = terminalContent.querySelector('.terminal-input-line');
        if (inputContainer) {
            inputContainer.parentNode.insertBefore(outputDiv, inputContainer);
        } else {
            terminalContent.appendChild(outputDiv);
        }
        
        // Scroll after adding output
        terminalContent.scrollTop = terminalContent.scrollHeight;
    }

    clearTerminalContent(terminalContent) {
        const isProjectsDir = this.currentPath.startsWith('~/projects');
        const isTerminal = this.currentPath === '~';

        // Clear all content
        terminalContent.innerHTML = '';

        if (isProjectsDir) {
            // For projects terminal, show initial ls output
            const lsOutput = document.createElement('div');
            lsOutput.style.marginBottom = '12px';
            lsOutput.innerHTML = `<span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">${this.currentPath}</span>$ ls`;
            terminalContent.appendChild(lsOutput);

            const lsResult = document.createElement('div');
            lsResult.style.marginBottom = '16px';
            lsResult.style.color = 'var(--terminal-accent)';
            lsResult.textContent = 'web-audio-player/    earthquake-visualization/    door-dashboard/    veto-system/';
            terminalContent.appendChild(lsResult);

            const helpHint = document.createElement('div');
            helpHint.style.marginBottom = '12px';
            helpHint.innerHTML = `<span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">${this.currentPath}</span>$ echo "Type 'help' for available commands"`;
            terminalContent.appendChild(helpHint);

            const helpHintOutput = document.createElement('div');
            helpHintOutput.style.marginBottom = '16px';
            helpHintOutput.style.color = 'var(--terminal-text-secondary)';
            helpHintOutput.textContent = "Type 'help' for available commands";
            terminalContent.appendChild(helpHintOutput);
        } else if (isTerminal) {
            // For main terminal, show welcome commands
            const commands = [
                { cmd: 'whoami', output: 'Emanuel Lugo Rivera - Full-Stack Engineer & Cybersecurity Specialist' },
                { cmd: 'cat ~/.skills', output: `Frontend: React, TypeScript, TailwindCSS, Vite
Backend: Python, Node.js, Flask, Django
Database: PostgreSQL, MongoDB
Security: Penetration Testing, Vulnerability Assessment
Audio: Web Audio API, Real-time Visualization` },
                { cmd: 'ls ~/projects', output: 'web-audio-player/  earthquake-viz/  door-dashboard/  veto-system/', accent: true },
                { cmd: 'echo "Type \'help\' for available commands"', output: "Type 'help' for available commands" }
            ];

            commands.forEach((item, index) => {
                const cmdLine = document.createElement('div');
                cmdLine.style.marginBottom = '12px';
                cmdLine.innerHTML = `<span class="terminal-prompt">${this.username}@${this.hostname}</span>:<span class="terminal-path">~</span>$ ${item.cmd}`;
                terminalContent.appendChild(cmdLine);

                const outputLine = document.createElement('div');
                outputLine.style.marginBottom = index === commands.length - 1 ? '16px' : '16px';
                outputLine.style.color = item.accent ? 'var(--terminal-accent)' : 'var(--terminal-text-secondary)';
                outputLine.style.whiteSpace = 'pre-line';
                outputLine.textContent = item.output;
                terminalContent.appendChild(outputLine);
            });
        }

        // Create fresh prompt line
        this.createNewPromptLine(terminalContent);
        
        // Ensure scroll to bottom after clear
        this.scrollToBottom(terminalContent);
    }

    // Helper methods
    directoryExists(path) {
        const parts = path.split('/').filter(p => p);
        let current = this.fileSystem['~'];

        for (const part of parts.slice(1)) {
            if (current.contents && current.contents[part] && current.contents[part].type === 'directory') {
                current = current.contents[part];
            } else {
                return false;
            }
        }

        return true;
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
        commandLine.style.marginBottom = '4px';
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