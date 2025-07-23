// Keep-It-Moving (KIM) VS Code Extension
// Integrates with GitHub Copilot chat for prompt injection 🚀

const vscode = require('vscode');
const path = require('path');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const os = require('os');

// Embedded KIM Server - no external dependencies! 🚀
let embeddedServer = null;
let serverPort = 8080;
let currentPairingCode = null;
let statusBarItem = null;

/**
 * Embedded KIM Relay Server - Runs directly in the VS Code extension! 🚀
 * No external processes needed - everything is self-contained
 */
class EmbeddedKIMServer {
    constructor(port = 8080) {
        this.port = parseInt(port);
        this.httpServer = null;
        this.wss = null;
        this.clients = new Map(); // token -> client connection
        this.pairingSessions = new Map(); // code -> { token, expires, deviceType }
        this.startTime = null;
        this.cleanupInterval = null;
        this.heartbeatInterval = null;
    }

    /**
     * Dynamically find an available port starting from the preferred port
     */
    async findAvailablePort(startPort = 8080) {
        const net = require('net');

        // Try ports in a smart range
        const portRanges = [
            // Preferred range around default
            Array.from({ length: 10 }, (_, i) => startPort + i),
            // Common development ports
            [3001, 3002, 3003, 4000, 4001, 5000, 5001],
            // Higher range if all else fails
            Array.from({ length: 20 }, (_, i) => 8100 + i)
        ].flat();

        for (const port of portRanges) {
            if (await this.isPortAvailable(port)) {
                console.log(`✅ Found available port: ${port}`);
                return port;
            }
        }

        // If all predefined ports are taken, find any available port
        return await this.findRandomAvailablePort();
    }

    /**
     * Check if a specific port is available
     */
    async isPortAvailable(port) {
        const net = require('net');

        return new Promise((resolve) => {
            const server = net.createServer();

            server.listen(port, '0.0.0.0', () => {
                server.close(() => resolve(true));
            });

            server.on('error', () => resolve(false));
        });
    }

    /**
     * Find any available port by letting the system assign one
     */
    async findRandomAvailablePort() {
        const net = require('net');

        return new Promise((resolve, reject) => {
            const server = net.createServer();

            server.listen(0, '0.0.0.0', () => {
                const port = server.address().port;
                server.close(() => {
                    console.log(`🎲 System assigned port: ${port}`);
                    resolve(port);
                });
            });

            server.on('error', reject);
        });
    }

    async start() {
        this.startTime = Date.now();
        console.log('🚀 Starting embedded KIM server...');

        // Find an available port dynamically
        this.port = await this.findAvailablePort(this.port);
        await this.tryStartOnPort(this.port);

        // Set up periodic cleanup
        this.cleanupInterval = setInterval(() => this.cleanupExpiredTokens(), 5 * 60 * 1000);
        this.heartbeatInterval = setInterval(() => this.performHeartbeat(), 30 * 1000);

        console.log(`🎉 Embedded KIM Server running on port ${this.port}`);
        this.logNetworkInfo();
    }

    async tryStartOnPort(port) {
        return new Promise((resolve, reject) => {
            // Create HTTP server for PWA serving and API endpoints
            this.httpServer = http.createServer((req, res) => this.handleHttpRequest(req, res));

            // Create WebSocket server
            this.wss = new WebSocket.Server({
                server: this.httpServer
            });

            // Set up error handling before listening
            this.httpServer.on('error', (error) => {
                console.log(`❌ Server error on port ${port}:`, error.message);
                reject(error);
            });

            this.httpServer.listen(port, '0.0.0.0', () => {
                console.log(`✅ Server successfully bound to port ${port}`);
                resolve();
            });

            this.httpServer.on('error', reject);

            // Handle WebSocket connections
            this.wss.on('connection', (ws, req) => {
                ws.connectedAt = Date.now();
                ws.lastPing = Date.now();
                ws.clientIP = req.socket.remoteAddress;

                console.log('📱 New connection from:', ws.clientIP);

                // Send welcome message
                this.sendResponse(ws, 'welcome', true, 'Welcome to KIM! 🚀', '👋');

                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        ws.lastPing = Date.now();
                        this.handleMessage(ws, message);
                    } catch (error) {
                        console.error('🐛 Message parsing error:', error);
                        this.sendError(ws, 'Invalid message format', '🐛');
                    }
                });

                ws.on('close', () => {
                    console.log('👋 Client disconnected');
                    this.removeClient(ws);
                });

                ws.on('error', (error) => {
                    console.error('🐛 WebSocket error:', error);
                });

                // Set up heartbeat
                ws.isAlive = true;
                ws.on('pong', () => {
                    ws.isAlive = true;
                    ws.lastPing = Date.now();
                });
            });
        });
    }

    handleHttpRequest(req, res) {
        // Handle API endpoints
        if (req.url === '/api/server-info') {
            this.handleServerInfoRequest(req, res);
            return;
        }

        // Serve the PWA directly from the extension
        if (req.url === '/' || req.url === '/index.html') {
            this.servePWA(req, res);
            return;
        }

        // Handle PWA assets and routes
        if (req.url.startsWith('/assets/') || req.url.startsWith('/src/') || req.url.endsWith('.js') || req.url.endsWith('.css')) {
            this.servePWAAsset(req, res);
            return;
        }

        // For any other route, serve the PWA (SPA routing)
        this.servePWA(req, res);
    }

    servePWA(req, res) {
        const localIPs = this.getLocalIPs();
        const wsUrl = localIPs.length > 0 ? `ws://${localIPs[0]}:${this.port}` : `ws://localhost:${this.port}`;

        // Serve a complete PWA that connects to our WebSocket server
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>KIM - Keep It Moving 🚀</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                        color: #fff;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container { max-width: 400px; width: 100%; text-align: center; }
                    .logo { font-size: 4em; margin-bottom: 20px; animation: bounce 2s infinite; }
                    @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }
                    h1 { font-size: 2em; margin-bottom: 10px; color: #3b82f6; }
                    .subtitle { color: #888; margin-bottom: 30px; }
                    .status { 
                        background: #333; 
                        padding: 15px; 
                        border-radius: 8px; 
                        margin: 20px 0;
                        border-left: 4px solid #3b82f6;
                    }
                    .pairing-section { 
                        background: #333; 
                        padding: 20px; 
                        border-radius: 8px; 
                        margin: 20px 0; 
                        display: none;
                    }
                    .pairing-section.active { display: block; }
                    .code-input { 
                        width: 100%; 
                        padding: 15px; 
                        font-size: 18px; 
                        text-align: center; 
                        border: 2px solid #555; 
                        border-radius: 8px; 
                        background: #222; 
                        color: #fff; 
                        margin: 10px 0;
                        letter-spacing: 2px;
                    }
                    .code-input:focus { outline: none; border-color: #3b82f6; }
                    .button { 
                        background: #3b82f6; 
                        color: white; 
                        border: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-size: 16px; 
                        margin: 10px; 
                        transition: background 0.2s;
                        width: 100%;
                    }
                    .button:hover { background: #2563eb; }
                    .button:disabled { background: #555; cursor: not-allowed; }
                    .prompt-section { 
                        background: #333; 
                        padding: 20px; 
                        border-radius: 8px; 
                        margin: 20px 0; 
                        display: none;
                    }
                    .prompt-section.active { display: block; }
                    .prompt-input { 
                        width: 100%; 
                        padding: 15px; 
                        border: 2px solid #555; 
                        border-radius: 8px; 
                        background: #222; 
                        color: #fff; 
                        resize: vertical; 
                        min-height: 100px;
                        font-family: inherit;
                    }
                    .prompt-input:focus { outline: none; border-color: #3b82f6; }
                    .toast { 
                        position: fixed; 
                        top: 20px; 
                        right: 20px; 
                        background: #333; 
                        color: #fff; 
                        padding: 15px 20px; 
                        border-radius: 8px; 
                        border-left: 4px solid #3b82f6;
                        z-index: 1000;
                        opacity: 0;
                        transform: translateY(-20px);
                        transition: all 0.3s ease;
                        margin-bottom: 10px;
                    }
                    .toast.show { 
                        opacity: 1; 
                        transform: translateY(0); 
                    }
                    .toast.error { border-left-color: #ef4444; }
                    .toast.success { border-left-color: #10b981; }
                    .connection-info { 
                        background: #222; 
                        padding: 10px; 
                        border-radius: 4px; 
                        font-family: monospace; 
                        font-size: 12px; 
                        margin: 10px 0;
                        word-break: break-all;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">🚀</div>
                    <h1>Keep It Moving</h1>
                    <p class="subtitle">Send prompts to VS Code Copilot from anywhere!</p>
                    
                    <div class="status" id="status">
                        🔴 Connecting to KIM server...
                    </div>
                    

                    
                    <div class="pairing-section" id="pairingSection">
                        <h3>📱 Enter Pairing Code</h3>
                        <p>Get the 6-digit code from VS Code extension</p>
                        <input type="text" id="codeInput" class="code-input" placeholder="123456" maxlength="6">
                        <button class="button" id="pairButton" onclick="pair()">Connect Device</button>
                    </div>
                    
                    <div class="prompt-section" id="promptSection">
                        <h3>💬 Send Prompt to Copilot</h3>
                        <textarea id="promptInput" class="prompt-input" placeholder="Enter your prompt for GitHub Copilot..."></textarea>
                        <button class="button" id="sendButton" onclick="sendPrompt()">Send to Copilot 🚀</button>
                        <button class="button" onclick="disconnect()" style="background: #ef4444; margin-top: 10px;">Disconnect</button>
                    </div>
                </div>

                <script>
                    let ws = null;
                    let token = null;
                    let isConnected = false;
                    let isPaired = false;

                    // Auto-detect server URL from current page
                    const wsUrl = '${wsUrl}';

                    function showToast(message, type = 'info') {
                        const toast = document.createElement('div');
                        toast.className = \`toast \${type}\`;
                        toast.textContent = message;
                        
                        // Stack toasts by adjusting position
                        const existingToasts = document.querySelectorAll('.toast');
                        const offset = existingToasts.length * 70; // Stack with 70px spacing
                        toast.style.top = \`\${20 + offset}px\`;
                        
                        document.body.appendChild(toast);
                        
                        setTimeout(() => toast.classList.add('show'), 100);
                        setTimeout(() => {
                            toast.classList.remove('show');
                            setTimeout(() => {
                                if (document.body.contains(toast)) {
                                    document.body.removeChild(toast);
                                }
                            }, 300);
                        }, 3000);
                    }

                    function updateStatus(message, connected = false, paired = false) {
                        document.getElementById('status').textContent = message;
                        isConnected = connected;
                        isPaired = paired;
                        
                        document.getElementById('pairingSection').classList.toggle('active', connected && !paired);
                        document.getElementById('promptSection').classList.toggle('active', connected && paired);
                    }

                    function connect() {
                        if (ws && ws.readyState === WebSocket.OPEN) return;
                        
                        updateStatus('🔄 Connecting to KIM server...');
                        
                        ws = new WebSocket(wsUrl);
                        
                        ws.onopen = () => {
                            updateStatus('🟡 Connected - Enter pairing code', true, false);
                            showToast('Connected to KIM server! 🚀', 'success');
                        };
                        
                        ws.onmessage = (event) => {
                            const message = JSON.parse(event.data);
                            handleMessage(message);
                        };
                        
                        ws.onclose = () => {
                            updateStatus('🔴 Disconnected from server', false, false);
                            showToast('Disconnected from server', 'error');
                            setTimeout(connect, 2000); // Auto-reconnect
                        };
                        
                        ws.onerror = () => {
                            updateStatus('🔴 Connection failed', false, false);
                            showToast('Failed to connect to KIM server', 'error');
                        };
                    }

                    function handleMessage(message) {
                        switch (message.type) {
                            case 'paired':
                                token = message.data?.token;
                                updateStatus('🟢 Connected and paired! Ready to send prompts', true, true);
                                showToast(\`\${message.message} \${message.emoji}\`, 'success');
                                if (message.quip) {
                                    setTimeout(() => showToast(message.quip, 'info'), 1000);
                                }
                                break;
                            case 'prompt_received':
                                showToast(\`\${message.message} \${message.emoji}\`, 'success');
                                break;
                            case 'prompt_delivered':
                                showToast(\`\${message.message} \${message.emoji}\`, 'success');
                                if (message.quip) {
                                    setTimeout(() => showToast(message.quip, 'info'), 500);
                                }
                                break;
                            case 'error':
                                showToast(\`\${message.message} \${message.emoji}\`, 'error');
                                if (message.message.includes('coffee break')) {
                                    // Token expired, need to re-pair
                                    token = null;
                                    updateStatus('🟡 Connected - Enter pairing code', true, false);
                                }
                                break;
                        }
                    }

                    function pair() {
                        const code = document.getElementById('codeInput').value.trim();
                        if (!code || code.length !== 6) {
                            showToast('Please enter a 6-digit pairing code', 'error');
                            return;
                        }
                        
                        if (!ws || ws.readyState !== WebSocket.OPEN) {
                            showToast('Not connected to server', 'error');
                            return;
                        }
                        
                        ws.send(JSON.stringify({
                            type: 'pair',
                            code: code,
                            deviceInfo: {
                                type: 'mobile',
                                userAgent: navigator.userAgent,
                                timestamp: Date.now()
                            }
                        }));
                        
                        showToast('Pairing with code: ' + code, 'info');
                    }

                    function sendPrompt() {
                        const prompt = document.getElementById('promptInput').value.trim();
                        if (!prompt) {
                            showToast('Please enter a prompt', 'error');
                            return;
                        }
                        
                        if (!token || !ws || ws.readyState !== WebSocket.OPEN) {
                            showToast('Not connected or paired', 'error');
                            return;
                        }
                        
                        ws.send(JSON.stringify({
                            type: 'prompt',
                            token: token,
                            prompt: prompt
                        }));
                        
                        document.getElementById('promptInput').value = '';
                        showToast('Sending prompt...', 'info');
                    }

                    function disconnect() {
                        if (ws) {
                            ws.close();
                        }
                        token = null;
                        updateStatus('🔴 Disconnected', false, false);
                        showToast('Disconnected from KIM server', 'info');
                    }

                    // Handle Enter key in inputs
                    document.getElementById('codeInput').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') pair();
                    });
                    
                    document.getElementById('promptInput').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter' && e.ctrlKey) sendPrompt();
                    });

                    // Check for code in URL and auto-fill
                    const urlParams = new URLSearchParams(window.location.search);
                    const codeFromUrl = urlParams.get('code');
                    if (codeFromUrl && /^\\d{6}$/.test(codeFromUrl)) {
                        document.getElementById('codeInput').value = codeFromUrl;
                        showToast('QR code detected! Code auto-filled 📱', 'success');
                        
                        // Auto-pair after connection
                        setTimeout(() => {
                            if (isConnected && !isPaired) {
                                pair();
                            }
                        }, 1000);
                    }

                    // Auto-connect on page load
                    connect();
                </script>
            </body>
            </html>
        `);
    }

    servePWAAsset(req, res) {
        // For now, return 404 for assets since we're serving everything inline
        // Future enhancement: serve actual PWA assets from extension bundle
        res.writeHead(404, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        });
        res.end('🤖 Asset not found - but the embedded PWA has everything you need!');
    }

    handleServerInfoRequest(req, res) {
        const localIPs = this.getLocalIPs();
        const serverInfo = {
            port: this.port,
            ips: localIPs,
            websocketUrls: localIPs.map(ip => `ws://${ip}:${this.port}`),
            status: 'running',
            uptime: Date.now() - (this.startTime || Date.now()),
            activeConnections: this.wss?.clients?.size || 0,
            emoji: '🚀'
        };

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(serverInfo, null, 2));
    }

    getLocalIPs() {
        const networkInterfaces = os.networkInterfaces();
        const localIPs = [];

        Object.keys(networkInterfaces).forEach(interfaceName => {
            networkInterfaces[interfaceName].forEach(iface => {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIPs.push(iface.address);
                }
            });
        });

        return localIPs;
    }

    /**
     * Check if PWA is available on a specific port
     */
    async checkPWAAvailability(host, port) {
        return new Promise((resolve) => {
            const http = require('http');
            const req = http.get(`http://${host}:${port}`, { timeout: 2000 }, (res) => {
                resolve(res.statusCode < 500); // Any response except server error means something is running
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    logNetworkInfo() {
        const localIPs = this.getLocalIPs();
        if (localIPs.length > 0) {
            console.log('📱 Mobile devices can connect to:');
            localIPs.forEach(ip => {
                console.log(`   http://${ip}:${this.port} (PWA)`);
                console.log(`   ws://${ip}:${this.port} (WebSocket)`);
            });
            console.log('🎯 Share the PWA URL with your mobile device!');
        } else {
            console.log('⚠️  No local network interfaces found. Using localhost only.');
        }
    }

    handleMessage(ws, message) {
        const { type, token, code, prompt, deviceInfo } = message;

        switch (type) {
            case 'pair':
                this.handlePairing(ws, code, deviceInfo);
                break;
            case 'prompt':
                this.handlePrompt(ws, token, prompt);
                break;
            case 'ping':
                this.sendResponse(ws, 'pong', true, 'Connection alive', '💓');
                break;
            case 'generate_pairing_code':
                const newSession = this.generatePairingCode(deviceInfo?.deviceType || 'unknown');
                this.sendResponse(ws, 'pairing_code_generated', true, 'New pairing code', '🔢', null, {
                    code: newSession.code,
                    expiresIn: Math.ceil((newSession.expires - Date.now()) / 1000)
                });
                // Update the global pairing code for the extension
                currentPairingCode = newSession.code;
                break;
            default:
                this.sendError(ws, 'Unknown message type', '🤔');
        }
    }

    handlePairing(ws, code, deviceInfo = {}) {
        const validation = this.validatePairingCode(code);

        if (!validation.valid) {
            this.sendError(ws, validation.reason, validation.emoji);
            return;
        }

        const session = validation.session;
        session.isActive = false; // Mark as used

        // Store client connection
        this.clients.set(session.token, ws);
        ws.kimToken = session.token;

        const deviceEmoji = {
            phone: '📱',
            tablet: '📱',
            laptop: '💻',
            unknown: '📟'
        };

        const deviceType = session.deviceType || 'unknown';
        const emoji = deviceEmoji[deviceType] || '📟';

        const pairingQuips = [
            `Welcome to the coding party! ${emoji}🎉`,
            `Your ${deviceType} is now part of the squad! 👥`,
            `Connection established, let's code! ${emoji}💻`,
            `Ready to relay some awesome prompts! ${emoji}⚡`
        ];
        const randomQuip = pairingQuips[Math.floor(Math.random() * pairingQuips.length)];

        this.sendResponse(ws, 'paired', true, 'Device paired successfully!', '🚀', randomQuip, {
            token: session.token,
            expiresIn: 24 * 60 * 60 // 24 hours
        });

        console.log('🔗 Device paired successfully:', {
            code,
            token: session.token.substring(0, 8) + '...',
            deviceType: session.deviceType
        });
    }

    handlePrompt(ws, token, prompt) {
        if (!this.validateToken(token)) {
            this.sendError(ws, 'Your coding session took a coffee break! Please pair again', '☕');
            return;
        }

        if (!prompt || prompt.trim().length === 0) {
            this.sendError(ws, 'That prompt needs some love! Try again', '💝');
            return;
        }

        if (prompt.length > 1000) {
            this.sendError(ws, 'Whoa there! That prompt is a novel! Keep it under 1000 characters', '📚');
            return;
        }

        // Send confirmation to device with fun feedback
        const receivedQuips = [
            "Got it! Processing your brilliant idea! 🧠",
            "Prompt received loud and clear! 📡",
            "Your wish is my command! ✨",
            "Incoming transmission decoded! 🛸"
        ];
        const randomQuip = receivedQuips[Math.floor(Math.random() * receivedQuips.length)];

        this.sendResponse(ws, 'prompt_received', true, randomQuip, '📤');

        // Relay to VS Code (this extension!)
        this.relayToVSCode(prompt, token);

        console.log('📨 Prompt relayed:', prompt.substring(0, 50) + '...');
    }

    relayToVSCode(prompt, token) {
        console.log('🎯 Relaying prompt to VS Code Copilot:', prompt);

        // Generate a fun quip for the prompt
        const quips = [
            "Fresh from the mobile command center! 📱",
            "Incoming transmission from the field! 📡",
            "Your remote coding buddy says hi! 👋",
            "Delivered with extra emoji love! 💝"
        ];
        const randomQuip = quips[Math.floor(Math.random() * quips.length)];

        // Inject directly into Copilot chat using VS Code API
        vscode.commands.executeCommand('kim.injectPrompt', prompt, randomQuip);

        // Confirm delivery to the client
        setTimeout(() => {
            const client = this.clients.get(token);
            if (client) {
                this.sendResponse(client, 'prompt_delivered', true, 'Delivered to Copilot!', '🚀', randomQuip);
            }
        }, 200);
    }

    generatePairingCode(deviceType = 'unknown') {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const token = uuidv4();
        const expires = Date.now() + (10 * 60 * 1000); // 10 minutes

        const session = {
            code,
            token,
            expires,
            createdAt: Date.now(),
            deviceType,
            isActive: true
        };

        this.pairingSessions.set(code, session);
        console.log('🔢 Generated pairing code:', code, 'for device type:', deviceType);

        // Store for extension access
        currentPairingCode = code;

        return session;
    }

    async generateQRCode(code) {
        try {
            const localIPs = this.getLocalIPs();
            const serverUrl = localIPs.length > 0 ? `http://${localIPs[0]}:${this.port}` : `http://localhost:${this.port}`;

            const qrData = {
                type: 'kim-pairing',
                url: serverUrl,
                code: code,
                timestamp: Date.now()
            };

            return await QRCode.toDataURL(JSON.stringify(qrData), {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        } catch (error) {
            console.error('🐛 QR code generation failed:', error);
            return null;
        }
    }

    validatePairingCode(code) {
        const session = this.pairingSessions.get(code);

        if (!session) {
            return { valid: false, reason: 'Code not found', emoji: '🔍' };
        }

        if (!session.isActive) {
            return { valid: false, reason: 'Code already used', emoji: '🔒' };
        }

        if (Date.now() > session.expires) {
            this.pairingSessions.delete(code);
            return { valid: false, reason: 'Code expired', emoji: '⏰' };
        }

        return { valid: true, session };
    }

    validateToken(token) {
        return this.clients.has(token);
    }

    sendResponse(ws, type, success, message, emoji = '✅', quip = null, data = null) {
        const response = {
            type,
            success,
            message,
            emoji,
            quip,
            data,
            timestamp: Date.now()
        };

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response));
        }
    }

    sendError(ws, message, emoji = '❌') {
        this.sendResponse(ws, 'error', false, message, emoji);
    }

    removeClient(ws) {
        if (ws.kimToken) {
            this.clients.delete(ws.kimToken);
        }
    }

    cleanupExpiredTokens() {
        // Clean up expired pairing sessions
        const now = Date.now();
        for (const [code, session] of this.pairingSessions.entries()) {
            if (now > session.expires) {
                this.pairingSessions.delete(code);
            }
        }
    }

    performHeartbeat() {
        if (!this.wss) return;

        this.wss.clients.forEach((ws) => {
            if (!ws.isAlive) {
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });
    }

    async stop() {
        console.log('🛑 Stopping embedded KIM server...');

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        if (this.wss) {
            this.wss.close();
        }
        if (this.httpServer) {
            this.httpServer.close();
        }

        this.clients.clear();
        this.pairingSessions.clear();
        console.log('✅ Embedded KIM server stopped');
    }
}

// Server state with emoji indicators 🎭
const serverState = {
    status: 'stopped', // 'starting', 'running', 'stopping', 'error'
    connections: new Map(), // token -> connection info
    pairingSessions: new Map(), // code -> session data
    lastActivity: null
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('🚀 KIM Extension is now active!');

    // Get configuration
    const config = vscode.workspace.getConfiguration('kim');
    serverPort = config.get('serverPort', 8080);

    // Create status bar item with hover capability
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'kim.showStatus';
    updateStatusBar('🔴 Disconnected');

    // Add hover command to show QR code when hovering over status bar
    const statusBarHoverCommand = 'kim.statusBarHover';
    context.subscriptions.push(vscode.commands.registerCommand(statusBarHoverCommand, () => {
        vscode.commands.executeCommand('kim.showStatus');
    }));

    statusBarItem.show();

    // Create a custom hover provider for the status bar item
    statusBarItem.tooltip = 'KIM Status - Click for details';

    // Create a custom hover provider for the editor
    const hoverProvider = vscode.languages.registerHoverProvider('*', {
        provideHover(document, position, token) {
            // Only show hover when we have a pairing code
            if (!currentPairingCode) {
                return null;
            }

            // Get the line text at the current position
            const lineText = document.lineAt(position.line).text;

            // Check if cursor is at the end of the document where status bar might be
            const isNearBottom = position.line > document.lineCount - 5;

            // Only show hover in certain conditions to avoid interfering with normal coding
            if (!isNearBottom && !lineText.includes('KIM') && !lineText.includes('Copilot')) {
                return null;
            }

            // Create a mini QR code for the hover
            return createQRCodeHover(currentPairingCode);
        }
    });

    context.subscriptions.push(hoverProvider);
    context.subscriptions.push(statusBarItem);

    // Show pairing code command
    let showPairingCode = vscode.commands.registerCommand('kim.showPairingCode', async function () {
        try {
            // Auto-start embedded server if not running
            if (!embeddedServer) {
                vscode.window.showInformationMessage('🚀 Starting KIM embedded server...');
                await vscode.commands.executeCommand('kim.toggleServer');

                // Wait for server to start
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (!embeddedServer) {
                    vscode.window.showErrorMessage('🔌 Embedded server failed to start! Please try again.');
                    return;
                }
            }

            // Generate pairing code directly from embedded server
            const session = embeddedServer.generatePairingCode('vscode');
            currentPairingCode = session.code;

            // Show pairing code panel
            await showPairingCodePanel(currentPairingCode);
        } catch (error) {
            vscode.window.showErrorMessage('🐛 Failed to generate pairing code: ' + error.message);
        }
    });

    // Function to create manual code fallback when QR generation fails
    function createManualCodeFallback(code, pwaUrl, serverIp, pwaPort) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>KIM Pairing - Manual Mode</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        padding: 20px;
                        color: #e0e0e0;
                        background-color: #252526;
                        text-align: center;
                    }
                    .container {
                        max-width: 500px;
                        margin: 0 auto;
                    }
                    h1 {
                        font-size: 24px;
                        margin-bottom: 20px;
                        color: #f39c12;
                    }
                    .code {
                        font-size: 48px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 30px 0;
                        color: #3b82f6;
                        background-color: #333;
                        padding: 20px;
                        border-radius: 12px;
                        border: 3px dashed #3b82f6;
                    }
                    .button {
                        background-color: #3b82f6;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 10px;
                        transition: background-color 0.2s;
                    }
                    .button:hover {
                        background-color: #2563eb;
                    }
                    .instructions {
                        background-color: #333;
                        padding: 20px;
                        border-radius: 8px;
                        margin-top: 20px;
                        text-align: left;
                    }
                    .instructions h2 {
                        font-size: 18px;
                        margin-top: 0;
                        color: #3b82f6;
                    }
                    .instructions ol {
                        padding-left: 20px;
                        line-height: 1.6;
                    }
                    .url {
                        background-color: #333;
                        padding: 15px;
                        border-radius: 6px;
                        font-family: monospace;
                        margin: 15px 0;
                        word-break: break-all;
                        font-size: 14px;
                    }
                    .warning {
                        background-color: #f39c12;
                        color: #000;
                        padding: 15px;
                        border-radius: 6px;
                        margin: 20px 0;
                        font-weight: bold;
                    }
                    .step {
                        background-color: #444;
                        padding: 10px;
                        margin: 10px 0;
                        border-radius: 6px;
                        border-left: 4px solid #3b82f6;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📱 KIM Manual Pairing</h1>
                    
                    <div class="warning">
                        ⚠️ QR code generation failed, but manual pairing works perfectly!
                    </div>
                    
                    <div class="code">${code}</div>
                    
                    <button class="button" id="copyCode">📋 Copy Code</button>
                    <button class="button" id="copyUrl">🔗 Copy PWA URL</button>
                    <button class="button" id="newCode">🔄 Generate New</button>
                    
                    <div class="url">
                        PWA URL: ${pwaUrl}
                    </div>
                    
                    <div class="instructions">
                        <h2>📱 Manual Pairing Steps:</h2>
                        
                        <div class="step">
                            <strong>Step 1:</strong> Open the PWA URL above on your device<br>
                            <em>Tip: Copy the URL and send it to your phone via text/email</em>
                        </div>
                        
                        <div class="step">
                            <strong>Step 2:</strong> On the PWA, switch to "Manual" mode
                        </div>
                        
                        <div class="step">
                            <strong>Step 3:</strong> Enter the 6-digit code: <strong>${code}</strong>
                        </div>
                        
                        <div class="step">
                            <strong>Step 4:</strong> Start sending prompts! 🎉
                        </div>
                    </div>
                    
                    <div class="instructions">
                        <h2>🔧 Troubleshooting:</h2>
                        <ul>
                            <li>Make sure your device is on the same network</li>
                            <li>Check that the PWA is running on port ${pwaPort}</li>
                            <li>Server IP: ${serverIp}</li>
                            <li>If code expires, click "Generate New" above</li>
                        </ul>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('copyCode').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'copyCode',
                            code: '${code}'
                        });
                    });
                    
                    document.getElementById('copyUrl').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'copyUrl',
                            url: '${pwaUrl}'
                        });
                    });
                    
                    document.getElementById('newCode').addEventListener('click', () => {
                        vscode.postMessage({
                            command: 'newCode'
                        });
                    });
                </script>
            </body>
            </html>
        `;
    }

    // Function to show pairing code in a panel with QR code
    async function showPairingCodePanel(code) {
        // Get server port from embedded server or default
        const currentServerPort = embeddedServer ? embeddedServer.port : serverPort;
        // Create and show panel
        const panel = vscode.window.createWebviewPanel(
            'kimPairingCode',
            'KIM Pairing Code',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        // Get local IP addresses
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        const ipAddresses = [];

        Object.keys(networkInterfaces).forEach(interfaceName => {
            const interfaces = networkInterfaces[interfaceName];
            interfaces.forEach(iface => {
                // Skip internal and non-IPv4 addresses
                if (!iface.internal && iface.family === 'IPv4') {
                    ipAddresses.push(iface.address);
                }
            });
        });

        // Use first IP address or localhost if none found
        const serverIp = ipAddresses.length > 0 ? ipAddresses[0] : 'localhost';

        // Generate direct URL for QR code with server connection info
        // Try to detect if PWA is running on a different port
        const config = vscode.workspace.getConfiguration('kim');
        let pwaPort = config.get('pwaPort', 3000);

        // Define pwaUrl outside try block so it's available in catch
        // Use the same port as the server since it serves the PWA
        let pwaUrl = `http://${serverIp}:${currentServerPort}?code=${code}`;

        try {
            // Check if PWA is actually running on the configured port
            const pwaRunning = await embeddedServer?.checkPWAAvailability?.(serverIp, pwaPort);
            if (!pwaRunning) {
                // Try common development ports
                const commonPorts = [3000, 3001, 5173, 4173, 8080, currentServerPort];
                for (const testPort of commonPorts) {
                    // Simple port check instead of PWA availability
                    pwaPort = testPort;
                    console.log(`📱 Using port ${pwaPort} for PWA`);
                    break;
                }
            }

            // Update pwaUrl with final port (use server port since it serves the PWA)
            pwaUrl = `http://${serverIp}:${currentServerPort}?code=${code}`;

            // Generate QR code with direct URL (not JSON)
            // Generate QR code as data URL with direct URL
            const qrCodeDataUrl = await QRCode.toDataURL(pwaUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            // Create HTML content
            panel.webview.html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>KIM Pairing</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                            padding: 20px;
                            color: #e0e0e0;
                            background-color: #252526;
                            text-align: center;
                        }
                        .container {
                            max-width: 500px;
                            margin: 0 auto;
                        }
                        h1 {
                            font-size: 24px;
                            margin-bottom: 20px;
                        }
                        .qr-container {
                            background-color: white;
                            padding: 20px;
                            border-radius: 8px;
                            display: inline-block;
                            margin-bottom: 20px;
                        }
                        .code {
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 4px;
                            margin: 20px 0;
                            color: #3b82f6;
                        }
                        .button {
                            background-color: #3b82f6;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            margin: 5px;
                        }
                        .instructions {
                            background-color: #333;
                            padding: 15px;
                            border-radius: 8px;
                            margin-top: 20px;
                            text-align: left;
                        }
                        .instructions h2 {
                            font-size: 16px;
                            margin-top: 0;
                        }
                        .instructions ol {
                            padding-left: 20px;
                        }
                        .url {
                            background-color: #333;
                            padding: 10px;
                            border-radius: 4px;
                            font-family: monospace;
                            margin: 10px 0;
                            word-break: break-all;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🔗 KIM Pairing Code</h1>
                        
                        <div class="qr-container">
                            <img src="${qrCodeDataUrl}" alt="QR Code" width="300" height="300">
                        </div>
                        
                        <div class="code">${code}</div>
                        
                        <button class="button" id="copyCode">📋 Copy Code</button>
                        <button class="button" id="newCode">🔄 Generate New</button>
                        
                        <div class="url">
                            PWA URL: ${pwaUrl}
                        </div>
                        <p class="text-sm mt-2">Scan this QR code with your phone to open the PWA with automatic pairing</p>
                        
                        <div class="instructions">
                            <h2>📱 How to Connect:</h2>
                            <ol>
                                <li>Open the PWA URL on your device</li>
                                <li>Scan this QR code or enter the 6-digit code</li>
                                <li>Start sending prompts to Copilot!</li>
                            </ol>
                        </div>
                    </div>
                    
                    <script>
                        const vscode = acquireVsCodeApi();
                        
                        document.getElementById('copyCode').addEventListener('click', () => {
                            vscode.postMessage({
                                command: 'copyCode',
                                code: '${code}'
                            });
                        });
                        
                        document.getElementById('newCode').addEventListener('click', () => {
                            vscode.postMessage({
                                command: 'newCode'
                            });
                        });
                    </script>
                </body>
                </html>
            `;

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'copyCode':
                            vscode.env.clipboard.writeText(message.code);
                            vscode.window.showInformationMessage('📋 Code copied to clipboard!');
                            break;
                        case 'copyUrl':
                            vscode.env.clipboard.writeText(message.url);
                            vscode.window.showInformationMessage('🔗 PWA URL copied to clipboard!');
                            break;
                        case 'newCode':
                            vscode.commands.executeCommand('kim.showPairingCode');
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );
        } catch (error) {
            console.error('Failed to generate QR code:', error);

            // Show a more helpful error message
            const errorQuips = [
                '🎨 QR code got stage fright!',
                '📱 QR generator took a coffee break!',
                '🌀 QR code is having an artistic moment!',
                '🎭 QR code is being a bit dramatic today!',
                '☕ QR generator needs more caffeine!',
                '🎪 QR code decided to join the circus!',
                '🚀 QR code launched into orbit!'
            ];
            const randomQuip = errorQuips[Math.floor(Math.random() * errorQuips.length)];

            vscode.window.showWarningMessage(`${randomQuip} Using manual code instead.`);

            // Log the actual error for debugging (but keep user message playful)
            console.log(`🐛 QR Code Error Details: ${error.message}`);
            console.log(`📊 Error Context: Code=${code}, URL=${pwaUrl}`);

            // Create manual fallback HTML
            panel.webview.html = createManualCodeFallback(code, pwaUrl, serverIp, pwaPort);
        }
    }

    // Toggle server command - now uses embedded server! 🚀
    let toggleServer = vscode.commands.registerCommand('kim.toggleServer', async function () {
        if (embeddedServer) {
            // Stop embedded server
            try {
                await embeddedServer.stop();
                embeddedServer = null;
                updateStatusBar('🔴 Disconnected');
                vscode.window.showInformationMessage('🛑 KIM Embedded Server stopped');
            } catch (error) {
                vscode.window.showErrorMessage('🐛 Failed to stop server: ' + error.message);
            }
        } else {
            // Start embedded server
            try {
                embeddedServer = new EmbeddedKIMServer(serverPort);
                await embeddedServer.start();

                // Update the actual port (in case it changed due to conflicts)
                serverPort = embeddedServer.port;

                updateStatusBar('🟢 Connected');
                vscode.window.showInformationMessage(`🚀 KIM Embedded Server started on port ${serverPort}${serverPort !== embeddedServer.port ? ` (auto-selected from ${embeddedServer.port})` : ''}`);

                // Auto-generate a pairing code
                setTimeout(() => {
                    if (embeddedServer) {
                        const session = embeddedServer.generatePairingCode('vscode');
                        currentPairingCode = session.code;
                        console.log('🔢 Auto-generated pairing code:', currentPairingCode);
                    }
                }, 500);

            } catch (error) {
                let errorMsg = '🐛 Failed to start embedded server: ' + error.message;

                if (error.message.includes('EADDRINUSE')) {
                    errorMsg = `🔌 Port ${serverPort} is busy. KIM will automatically find an available port next time.`;
                } else if (error.message.includes('EACCES')) {
                    errorMsg = `🔒 Permission denied on port ${serverPort}. Try using a port above 1024.`;
                }

                vscode.window.showErrorMessage(errorMsg);
                updateStatusBar('🔴 Error');
                embeddedServer = null;
            }
        }
    });

    // Show status command
    let showStatus = vscode.commands.registerCommand('kim.showStatus', function () {
        const serverStatus = embeddedServer ? '🟢 Running (Embedded)' : '🔴 Stopped';
        const connectionStatus = embeddedServer ? '🟢 Direct Connection' : '🔴 Disconnected';
        const copilotStatus = vscode.extensions.getExtension('GitHub.copilot') ? '🟢 Available' : '🔴 Not Found';
        const pairingStatus = currentPairingCode ? `🔢 Code: ${currentPairingCode}` : '⏳ No active code';

        const statusMessage = `📊 KIM Status Report:
        
🖥️  Server: ${serverStatus}
🔗 Connection: ${connectionStatus}  
🤖 Copilot: ${copilotStatus}
🔐 Pairing: ${pairingStatus}
🌐 Port: ${serverPort}

💡 Use "KIM: Toggle Server" to start/stop
💡 Use "KIM: Show Pairing Code" to pair devices`;

        vscode.window.showInformationMessage(statusMessage, { modal: false }, 'Copy Status', 'Refresh')
            .then(selection => {
                if (selection === 'Copy Status') {
                    vscode.env.clipboard.writeText(statusMessage.replace(/📊|🖥️|🔗|🤖|🔐|🌐|💡/g, '').trim());
                    vscode.window.showInformationMessage('📋 Status copied to clipboard!');
                } else if (selection === 'Refresh') {
                    vscode.commands.executeCommand('kim.showStatus');
                }
            });
    });

    // Inject prompt directly into Copilot chat
    let injectPrompt = vscode.commands.registerCommand('kim.injectPrompt', async function (prompt, quip) {
        try {
            // Check if Copilot is available
            const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
            if (!copilotExtension) {
                const copilotErrors = [
                    '🍕 Copilot seems to be out for lunch!',
                    '🤖 Copilot is taking a digital coffee break!',
                    '🛸 Copilot has temporarily left the building!',
                    '🎯 Copilot is playing hide and seek!'
                ];
                const randomError = copilotErrors[Math.floor(Math.random() * copilotErrors.length)];
                vscode.window.showErrorMessage(randomError);
                return;
            }

            // Show the quip to the user as a fun notification, not to Copilot
            if (quip) {
                vscode.window.showInformationMessage(`📱 ${quip}`, { modal: false });
            }

            console.log('😺 Injecting prompt into Copilot Chat:', prompt);

            // Direct injection using VS Code Chat API
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: prompt
            });

            vscode.window.showInformationMessage(`✅ Prompt delivered: "${prompt.substring(0, 50)}..."`);
            console.log('✅ Successfully injected prompt into Copilot Chat');

        } catch (error) {
            console.error('❌ Extension error:', error);
            vscode.window.showErrorMessage('🌀 Prompt injection failed: ' + error.message);
        }
    });

    context.subscriptions.push(showPairingCode, toggleServer, showStatus, injectPrompt);

    // Auto-start embedded server on activation
    const autoStart = config.get('autoStartServer', true); // Default to true for embedded server
    if (autoStart) {
        vscode.window.showInformationMessage('🚀 Starting KIM embedded server...');
        vscode.commands.executeCommand('kim.toggleServer');
    } else {
        vscode.window.showInformationMessage('🔍 KIM server ready to start - use "KIM: Show Pairing Code" to begin! 📡');
    }
}

// Embedded server status management - much simpler! 🚀

function updateStatusBar(text, tooltip = null) {
    if (statusBarItem) {
        statusBarItem.text = `KIM ${text}`;

        // Set tooltip based on status
        if (currentPairingCode) {
            statusBarItem.tooltip = tooltip || `Keep-It-Moving Status: ${text} - Click for details`;
        } else {
            statusBarItem.tooltip = tooltip || `Keep-It-Moving Status: ${text} - Click for details`;
        }

        // Update color based on status
        if (text.includes('🟢')) {
            statusBarItem.backgroundColor = undefined;
            statusBarItem.color = undefined;
        } else if (text.includes('🟡')) {
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else if (text.includes('🔴')) {
            statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
    }
}

/**
 * Creates a hover with QR code for the pairing code
 * @param {string} code - The pairing code
 * @returns {vscode.Hover} - The hover with QR code
 */
async function createQRCodeHover(code) {
    try {
        // Get local IP addresses
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        const ipAddresses = [];

        Object.keys(networkInterfaces).forEach(interfaceName => {
            const interfaces = networkInterfaces[interfaceName];
            interfaces.forEach(iface => {
                // Skip internal and non-IPv4 addresses
                if (!iface.internal && iface.family === 'IPv4') {
                    ipAddresses.push(iface.address);
                }
            });
        });

        // Use first IP address or localhost if none found
        const serverIp = ipAddresses.length > 0 ? ipAddresses[0] : 'localhost';

        // Generate direct URL for QR code
        const config = vscode.workspace.getConfiguration('kim');
        const pwaPort = config.get('pwaPort', 3000);
        const pwaUrl = `http://${serverIp}:${pwaPort}?code=${code}`;

        // Generate small QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(pwaUrl, {
            width: 150,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // Create markdown content for hover
        const content = new vscode.MarkdownString();
        content.supportHtml = true;
        content.appendMarkdown(`### KIM Pairing Code: ${code}\n\n`);
        content.appendMarkdown(`<img src="${qrCodeDataUrl}" width="150" height="150" alt="QR Code" />\n\n`);
        content.appendMarkdown(`Scan with your phone to connect\n\n`);
        content.appendMarkdown(`PWA URL: \`${pwaUrl}\``);

        return new vscode.Hover(content);
    } catch (error) {
        console.error('Failed to create QR code hover:', error);

        // Fallback to simple text hover
        const content = new vscode.MarkdownString();
        content.appendMarkdown(`### KIM Pairing Code: ${code}\n\n`);
        content.appendMarkdown(`Run "KIM: Show Pairing Code" for QR code`);

        return new vscode.Hover(content);
    }
}

function createManualCodeFallback(code, pwaUrl, serverIp, pwaPort) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>KIM Pairing - Manual Mode</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    padding: 20px;
                    color: #e0e0e0;
                    background-color: #252526;
                    text-align: center;
                }
                .container {
                    max-width: 500px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .code {
                    font-size: 48px;
                    font-weight: bold;
                    letter-spacing: 8px;
                    margin: 30px 0;
                    color: #3b82f6;
                    background-color: #333;
                    padding: 20px;
                    border-radius: 12px;
                    border: 2px dashed #3b82f6;
                }
                .button {
                    background-color: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px;
                    transition: background-color 0.2s;
                }
                .button:hover {
                    background-color: #2563eb;
                }
                .instructions {
                    background-color: #333;
                    padding: 20px;
                    border-radius: 8px;
                    margin-top: 20px;
                    text-align: left;
                }
                .url {
                    background-color: #333;
                    padding: 15px;
                    border-radius: 6px;
                    font-family: monospace;
                    margin: 15px 0;
                    word-break: break-all;
                    font-size: 14px;
                }
                .emoji {
                    font-size: 1.2em;
                    margin-right: 8px;
                }
                .fallback-notice {
                    background-color: #fbbf24;
                    color: #92400e;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-weight: 500;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="fallback-notice">
                    <span class="emoji">📱</span> QR code couldn't load, but manual pairing works great!
                </div>
                
                <h1><span class="emoji">🔢</span> KIM Pairing Code</h1>
                
                <div class="code">${code}</div>
                
                <button class="button" id="copyCode">
                    <span class="emoji">📋</span> Copy Code
                </button>
                <button class="button" id="newCode">
                    <span class="emoji">🔄</span> Generate New
                </button>
                
                <div class="url">
                    <strong>PWA URL:</strong><br>
                    ${pwaUrl}
                </div>
                
                <div class="instructions">
                    <h2><span class="emoji">📱</span> How to Connect:</h2>
                    <ol>
                        <li>Open the PWA URL above on your device</li>
                        <li>Switch to "Manual" mode if needed</li>
                        <li>Enter the 6-digit code: <strong>${code}</strong></li>
                        <li>Start sending prompts to Copilot! <span class="emoji">🎉</span></li>
                    </ol>
                    
                    <p><strong>💡 Pro tip:</strong> Copy the code above and paste it directly!</p>
                </div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                document.getElementById('copyCode').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'copyCode',
                        code: '${code}'
                    });
                });
                
                document.getElementById('newCode').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'newCode'
                    });
                });
            </script>
        </body>
        </html>
    `;
}

function deactivate() {
    console.log('👋 KIM Extension deactivated');

    // Clean up embedded server
    if (embeddedServer) {
        embeddedServer.stop();
        embeddedServer = null;
    }
}

module.exports = {
    activate,
    deactivate
};