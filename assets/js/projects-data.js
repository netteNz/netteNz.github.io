// Single source of truth for project copy.
// Consumers: terminal-engine.js (filesystem + READMEs) and macos.js (Work window).
// The <noscript> block in index.html is static HTML and must be kept in sync by hand.
//
// Shape: { slug, name, summary, stack: string[], live?: url, repo?: url, readme: string[] }
// Every value here is rendered as text (textContent / escaped), never as raw HTML.
window.PROJECTS = [
    {
        slug: 'oled-bonnet',
        name: 'OLED system HUD',
        summary: 'A system-monitor display for a Raspberry Pi, built on a partial-update OLED driver.',
        stack: ['python', 'raspberry-pi', 'i2c', 'numpy', 'pytest', 'systemd'],
        repo: 'https://github.com/netteNz/oled-bonnet',
        readme: [
            'Partial-blit SSD1305 driver that pushes only the changed region',
            'No-PIL animation engine with a fixed-timestep frame clock and soak-test harness',
            'HUD daemon with a diffing compositor, rotating views and threshold alerts, run as a systemd service',
            'Demos include a live FFT spectrum and an ITU-R BS.1770-4 LUFS loudness meter',
            'Hardware-free pytest suite covering the driver math and every daemon module'
        ]
    },
    {
        slug: 'trading-dashboard',
        name: 'Trading dashboard',
        summary: 'A self-hosted charting dashboard with a custom indicator engine and live streaming.',
        stack: ['react', 'vite', 'flask', 'socket.io', 'pandas-ta'],
        repo: 'https://github.com/netteNz/trading-dashboard',
        readme: [
            'React 18 + Lightweight Charts frontend',
            'Flask-SocketIO backend streaming Alpaca market data over WebSocket',
            'Custom indicator modules on top of pandas-ta, no indicator limit',
            'yfinance by default, no API keys needed'
        ]
    },
    {
        slug: 'rl-trading-bot',
        name: 'RL trading bot',
        summary: 'Reinforcement learning agent for stock trading, trained with PPO (stable-baselines3) in a custom Gymnasium environment.',
        stack: ['python', 'stable-baselines3', 'gymnasium'],
        repo: 'https://github.com/netteNz/reinforcement-learning-stocks',
        readme: [
            'PPO agent trained with stable-baselines3',
            'Custom Gymnasium trading environment',
            'Backtesting on historical market data',
            'Performance evaluation metrics'
        ]
    },
    {
        slug: 'macropad-profiles',
        name: 'MacroPad firmware',
        summary: 'CircuitPython firmware giving an RP2040 macro pad per-app key profiles and an OLED UI.',
        stack: ['circuitpython', 'rp2040', 'i2c'],
        repo: 'https://github.com/netteNz/macropad-profiles',
        readme: [
            'One profile file per app sets 12 keys, the knob and the LED mode',
            'Encoder gestures, including hold-and-turn to switch profiles',
            'Non-blocking macros: chords, delays, typed text and media keys',
            'Optional extra OLEDs behind a PCA9548A I²C mux',
            'Works as a plain USB keyboard, no host software needed'
        ]
    },
    {
        slug: 'web-audio-player',
        name: 'Web audio player',
        summary: 'Real-time audio visualizer built on the Web Audio API, with LUFS loudness metering and a live frequency spectrum.',
        stack: ['react', 'typescript', 'web-audio-api'],
        live: 'https://nettenz.github.io/web-audio-app',
        repo: 'https://github.com/netteNz/web-audio-app',
        readme: [
            'Live frequency spectrum analysis',
            'LUFS loudness metering',
            'Waveform visualization',
            'React and TypeScript architecture'
        ]
    },
    {
        // TODO(copy): confirm repo URL. The map loads its CSV from netteNz/earthquakes-pr,
        // and the map code itself lives in this repo under projects/earthquake-map.
        slug: 'earthquake-visualization',
        name: 'Earthquake visualization',
        summary: 'Interactive map of Puerto Rico earthquake data, rendered in the browser with Python through PyScript.',
        stack: ['python', 'pandas', 'folium', 'pyscript'],
        live: 'https://nettenz.github.io/earthquakes_pr.html',
        repo: 'https://github.com/netteNz/earthquakes_pr',
        readme: [
            'Seismic events plotted on an interactive map',
            'Markers colored by magnitude',
            'pandas and Folium running in the browser through PyScript'
        ]
    },
    {
        slug: 'veto-system',
        name: 'Veto system',
        summary: 'Team decision-making tool where members vote on options and can veto them.',
        stack: ['typescript', 'react'],
        live: 'https://nettenz.github.io/veto-tsd/',
        repo: 'https://github.com/netteNz/veto-tsd',
        readme: [
            'Voting with veto power',
            'Decision tracking',
            'Tools for reaching team consensus',
            'TypeScript and React'
        ]
    }
];
