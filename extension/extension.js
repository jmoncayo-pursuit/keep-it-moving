// Keep-It-Moving (KIM) VS Code Extension
// Integrates with GitHub Copilot chat for prompt injection 🚀

const vscode = require('vscode');
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
                    .history-section {
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px solid #555;
                    }
                    .history-section h4 {
                        margin: 0 0 10px 0;
                        font-size: 16px;
                        color: #e0e0e0;
                    }
                    .prompt-history {
                        background: #222;
                        border-radius: 6px;
                        padding: 10px;
                        max-height: 200px;
                        overflow-y: auto;
                        margin-bottom: 10px;
                    }
                    .history-item {
                        background: #333;
                        padding: 8px 10px;
                        margin: 5px 0;
                        border-radius: 4px;
                        border-left: 3px solid #3b82f6;
                        font-size: 13px;
                        line-height: 1.4;
                        cursor: pointer;
                        transition: background-color 0.2s ease;
                    }
                    .history-item:hover {
                        background: #404040;
                        border-left-color: #60a5fa;
                    }
                    .history-item .timestamp {
                        color: #888;
                        font-size: 11px;
                        margin-bottom: 4px;
                    }
                    .history-item .prompt-text {
                        color: #e0e0e0;
                        word-wrap: break-word;
                    }
                    .history-item .reuse-hint {
                        color: #888;
                        font-size: 10px;
                        margin-top: 4px;
                        opacity: 0;
                        transition: opacity 0.2s ease;
                    }
                    .history-item:hover .reuse-hint {
                        opacity: 1;
                    }
                    .history-empty {
                        color: #888;
                        font-style: italic;
                        text-align: center;
                        padding: 20px;
                        margin: 0;
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
                        <h3>📱 Connect to KIM</h3>
                        <p>Enter pairing code or scan QR code</p>
                        

                        
                        <input type="text" id="codeInput" class="code-input" placeholder="123456" maxlength="6">
                        <button class="button" id="pairButton" onclick="pair()">Connect Device</button>
                    </div>
                    
                    <div class="prompt-section" id="promptSection">
                        <h3>💬 Send Prompt to Copilot</h3>
                        <textarea id="promptInput" class="prompt-input" placeholder="Enter your prompt for GitHub Copilot..."></textarea>
                        <button class="button" id="sendButton" onclick="sendPrompt()">Send to Copilot 🚀</button>
                        
                        <div class="history-section">
                            <h4>📜 Recent Prompts</h4>
                            <div id="promptHistory" class="prompt-history">
                                <p class="history-empty">No prompts sent yet. Send your first prompt above! 🚀</p>
                            </div>
                            <button class="button" id="clearHistory" style="background: #6b7280; font-size: 12px; padding: 6px 12px;">🗑️ Clear History</button>
                        </div>
                        
                        <button class="button" onclick="disconnect()" style="background: #ef4444; margin-top: 10px;">Disconnect</button>
                        <button class="button" onclick="reconnect()" style="background: #10b981; margin-top: 10px; margin-left: 10px;">🔄 Reconnect</button>
                    </div>
                </div>

                <script>
                    let ws = null;
                    let token = null;
                    let isConnected = false;
                    let isPaired = false;
                    let promptHistory = [];
                    let lastConnectionState = null;
                    let hasShownDisconnectMessage = false;

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
                            const newState = 'connected';
                            
                            // Reset disconnect message flag when we successfully connect
                            hasShownDisconnectMessage = false;
                            
                            // Only show connection success if we were previously disconnected
                            const showConnectionMessage = lastConnectionState !== 'connected';
                            
                            // Check if we have a pre-auth token
                            if (window.preAuthToken) {
                                console.log('Sending pre-auth message');
                                ws.send(JSON.stringify({
                                    type: 'preauth',
                                    token: window.preAuthToken,
                                    deviceInfo: {
                                        type: 'mobile',
                                        userAgent: navigator.userAgent,
                                        timestamp: Date.now()
                                    }
                                }));
                                updateStatus('🟡 Pre-authenticating...', true, false);
                            } else {
                                updateStatus('🟡 Connected - Enter pairing code', true, false);
                                if (showConnectionMessage) {
                                    showToast('Connected to KIM server! 🚀', 'success');
                                }
                            }
                            
                            lastConnectionState = newState;
                        };
                        
                        ws.onmessage = (event) => {
                            const message = JSON.parse(event.data);
                            handleMessage(message);
                        };
                        
                        ws.onclose = () => {
                            const newState = 'disconnected';
                            updateStatus('🔴 Disconnected from server', false, false);
                            
                            // Only show disconnect message if we were previously connected
                            if (lastConnectionState === 'connected' && !hasShownDisconnectMessage) {
                                showToast('Disconnected from server', 'error');
                                hasShownDisconnectMessage = true;
                            }
                            
                            lastConnectionState = newState;
                            
                            // Auto-reconnect silently after delay (but not if manually disconnected)
                            setTimeout(() => {
                                if (!isConnected && lastConnectionState !== 'manually_disconnected') {
                                    connect();
                                }
                            }, 3000);
                        };
                        
                        ws.onerror = () => {
                            const newState = 'error';
                            updateStatus('🔴 Connection failed', false, false);
                            
                            // Only show error message if this is the first error and we were previously connected
                            if (lastConnectionState === 'connected') {
                                showToast('Connection lost', 'error');
                            }
                            
                            lastConnectionState = newState;
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
                        
                        // Add to history before sending
                        addToHistory(prompt);
                        
                        ws.send(JSON.stringify({
                            type: 'prompt',
                            token: token,
                            prompt: prompt
                        }));
                        
                        document.getElementById('promptInput').value = '';
                        showToast('Sending prompt...', 'info');
                    }                  

                    function addToHistory(prompt) {
                        const historyItem = {
                            prompt: prompt,
                            timestamp: new Date(),
                            id: Date.now()
                        };
                        
                        promptHistory.unshift(historyItem); // Add to beginning
                        
                        // Keep only last 10 prompts
                        if (promptHistory.length > 10) {
                            promptHistory = promptHistory.slice(0, 10);
                        }
                        
                        updateHistoryDisplay();
                    }
                    
                    function updateHistoryDisplay() {
                        const historyContainer = document.getElementById('promptHistory');
                        
                        if (promptHistory.length === 0) {
                            historyContainer.innerHTML = '<p class="history-empty">No prompts sent yet. Send your first prompt above! 🚀</p>';
                            return;
                        }
                        
                        const historyHTML = promptHistory.map(item => {
                            const timeStr = item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            const truncatedPrompt = item.prompt.length > 100 ? 
                                item.prompt.substring(0, 100) + '...' : 
                                item.prompt;
                            
                            return \`
                                <div class="history-item" onclick="reusePrompt('\${item.prompt.replace(/'/g, "\\'")}')">
                                    <div class="timestamp">📤 \${timeStr}</div>
                                    <div class="prompt-text">\${truncatedPrompt}</div>
                                    <div class="reuse-hint">💡 Click to reuse</div>
                                </div>
                            \`;
                        }).join('');
                        
                        historyContainer.innerHTML = historyHTML;
                    }
                    
                    function clearHistory() {
                        promptHistory = [];
                        updateHistoryDisplay();
                        showToast('History cleared! 🗑️', 'info');
                    }
                    
                    function reusePrompt(prompt) {
                        document.getElementById('promptInput').value = prompt;
                        showToast('Prompt loaded! 📝 Edit and send when ready.', 'info');
                    }

                    function disconnect() {
                        if (ws) {
                            ws.close();
                        }
                        token = null;
                        window.preAuthToken = null;
                        lastConnectionState = 'manually_disconnected';
                        hasShownDisconnectMessage = true; // Prevent auto-reconnect messages
                        updateStatus('🔴 Disconnected', false, false);
                        showToast('Disconnected from KIM server', 'info');
                        
                        // Clear history on disconnect
                        clearHistory();
                    }

                    function reconnect() {
                        // Reset state for manual reconnection
                        hasShownDisconnectMessage = false;
                        lastConnectionState = null;
                        showToast('🔄 Attempting to reconnect...', 'info');
                        connect();
                    }

                    // QR Code camera scanning functionality
                    let qrStream = null;
                    let qrScanInterval = null;
                    let isScanning = false;

                    async function startQRScan() {
                        try {
                            const video = document.getElementById('qrVideo');
                            const scannerSection = document.getElementById('qrScannerSection');
                            const scanButton = document.getElementById('scanQRButton');
                            
                            // Request camera access with back camera preference
                            const constraints = {
                                video: {
                                    facingMode: { ideal: 'environment' }, // Prefer back camera
                                    width: { ideal: 640 },
                                    height: { ideal: 480 }
                                }
                            };
                            
                            qrStream = await navigator.mediaDevices.getUserMedia(constraints);
                            video.srcObject = qrStream;
                            
                            scannerSection.style.display = 'block';
                            scanButton.style.display = 'none';
                            isScanning = true;
                            
                            showToast('📷 Camera active - point at QR code', 'success');
                            
                            // Wait for video to be ready
                            video.addEventListener('loadedmetadata', () => {
                                video.play();
                                startQRDetection();
                            });
                            
                        } catch (error) {
                            console.error('Camera access failed:', error);
                            
                            if (error.name === 'NotAllowedError') {
                                showToast('📷 Camera permission needed - please allow access', 'error');
                            } else if (error.name === 'NotFoundError') {
                                showToast('📷 No camera found on this device', 'error');
                            } else if (error.name === 'NotReadableError') {
                                showToast('📷 Camera is being used by another app', 'error');
                            } else {
                                showToast('📷 Camera access failed', 'error');
                            }
                        }
                    }

                    function stopQRScan() {
                        const video = document.getElementById('qrVideo');
                        const scannerSection = document.getElementById('qrScannerSection');
                        const scanButton = document.getElementById('scanQRButton');
                        
                        isScanning = false;
                        
                        if (qrStream) {
                            qrStream.getTracks().forEach(track => track.stop());
                            qrStream = null;
                        }
                        
                        if (qrScanInterval) {
                            clearInterval(qrScanInterval);
                            qrScanInterval = null;
                        }
                        
                        video.srcObject = null;
                        scannerSection.style.display = 'none';
                        scanButton.style.display = 'block';
                        
                        showToast('📷 Camera stopped', 'info');
                    }

                    function startQRDetection() {
                        if (!isScanning) return;
                        
                        qrScanInterval = setInterval(() => {
                            if (!isScanning) return;
                            scanForQRCode();
                        }, 300); // Scan every 300ms
                    }

                    function scanForQRCode() {
                        const video = document.getElementById('qrVideo');
                        const canvas = document.getElementById('qrCanvas');
                        const context = canvas.getContext('2d');
                        
                        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
                        
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        
                        if (canvas.width === 0 || canvas.height === 0) return;
                        
                        // Draw current video frame to canvas
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Get image data for QR detection
                        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                        
                        // Simple QR code detection using jsQR-like algorithm
                        const qrResult = detectQRCode(imageData);
                        if (qrResult) {
                            handleQRDetection(qrResult);
                        }
                    }

                    function detectQRCode(imageData) {
                        // Simplified QR detection - looking for URL patterns in image
                        // This is a basic implementation. For production, you'd use jsQR library
                        
                        // Convert to grayscale and look for QR patterns
                        const data = imageData.data;
                        const width = imageData.width;
                        const height = imageData.height;
                        
                        // Simple pattern detection for QR codes
                        // Look for high contrast square patterns
                        const threshold = 128;
                        let qrPatterns = 0;
                        
                        // Sample key points for QR finder patterns
                        const samplePoints = [
                            [width * 0.1, height * 0.1], // Top-left
                            [width * 0.9, height * 0.1], // Top-right  
                            [width * 0.1, height * 0.9], // Bottom-left
                        ];
                        
                        for (const [x, y] of samplePoints) {
                            const i = (Math.floor(y) * width + Math.floor(x)) * 4;
                            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                            
                            // Check for high contrast (QR finder pattern characteristic)
                            if (brightness < threshold) {
                                qrPatterns++;
                            }
                        }
                        
                        // If we detect potential QR patterns, try to extract URL
                        if (qrPatterns >= 2) {
                            // This is where a real QR library would decode the actual data
                            // For now, we'll return null and rely on manual fallback
                            return null;
                        }
                        
                        return null;
                    }

                    function handleQRDetection(qrData) {
                        if (!qrData) return;
                        
                        stopQRScan();
                        
                        try {
                            const qrUrl = new URL(qrData);
                            const token = qrUrl.searchParams.get('token');
                            const code = qrUrl.searchParams.get('code');
                            
                            if (token) {
                                // Pre-auth token found
                                window.preAuthToken = token;
                                showToast('🚀 QR code scanned! Connecting...', 'success');
                                connect();
                            } else if (code && code.length === 6) {
                                // Pairing code found
                                document.getElementById('codeInput').value = code;
                                showToast('📱 QR code scanned! Code filled.', 'success');
                                if (isConnected && !isPaired) {
                                    pair();
                                } else if (!isConnected) {
                                    connect();
                                }
                            } else {
                                showToast('❌ Invalid QR code format', 'error');
                            }
                            
                        } catch (error) {
                            showToast('❌ Could not parse QR code', 'error');
                        }
                    }



                    // Handle Enter key in inputs
                    document.getElementById('codeInput').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') pair();
                    });
                    
                    document.getElementById('promptInput').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter' && e.ctrlKey) sendPrompt();
                    });
                    

                    
                    // Handle clear history button
                    document.getElementById('clearHistory').addEventListener('click', clearHistory);

                    // Check for pre-auth token or pairing code in URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const preAuthToken = urlParams.get('token');
                    const codeFromUrl = urlParams.get('code');
                    
                    // Pre-authentication: Skip pairing entirely if we have a token
                    if (preAuthToken) {
                        console.log('Pre-auth token detected - will auto-authenticate');
                        token = preAuthToken;
                        showToast('🚀 Pre-auth token detected! Connecting...', 'success');
                        
                        // Send pre-auth message after connection
                        window.preAuthToken = preAuthToken;
                    }
                    // Fallback: Auto-fill pairing code if no pre-auth token
                    else if (codeFromUrl && codeFromUrl.length === 6 && !isNaN(codeFromUrl)) {
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
        console.log('🔍 Network Debug Info:');
        console.log('   All detected IPs:', localIPs);
        console.log('   Selected IP:', localIPs.length > 0 ? localIPs[0] : 'localhost');

        if (localIPs.length > 0) {
            console.log('📱 Local network access:');
            localIPs.forEach((ip, index) => {
                console.log(`   ${index === 0 ? '👑' : '  '} http://${ip}:${this.port} (PWA)`);
                console.log(`   ${index === 0 ? '👑' : '  '} ws://${ip}:${this.port} (WebSocket)`);
            });
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
            case 'preauth':
                this.handlePreAuth(ws, token, deviceInfo);
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

    handlePreAuth(ws, token, deviceInfo = {}) {
        // Find session by token
        let validSession = null;
        for (const [code, session] of this.pairingSessions.entries()) {
            if (session.token === token && session.expires > Date.now()) {
                validSession = session;
                break;
            }
        }

        if (!validSession) {
            this.sendError(ws, 'Invalid or expired pre-auth token', '❌');
            return;
        }

        // Store client connection with token
        this.clients.set(token, ws);
        ws.kimToken = token;

        // Send success response - already paired!
        this.sendResponse(ws, 'paired', true, 'Pre-authenticated successfully', '🚀',
            'Ready to send prompts!', { token });

        console.log('🚀 Device pre-authenticated:', {
            token: token.substring(0, 8) + '...',
            deviceType: validSession.deviceType
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

    generatePreAuthUrl(code) {
        const session = this.pairingSessions.get(code);
        if (!session) {
            return null;
        }

        // Get local URL
        const localIPs = this.getLocalIPs();
        const baseUrl = localIPs.length > 0 ? `http://${localIPs[0]}:${this.port}` : `http://localhost:${this.port}`;

        // Return URL with pre-auth token for instant access
        return `${baseUrl}?token=${session.token}`;
    }

    async generateQRCode(code) {
        try {
            // Use local URL
            const localIPs = this.getLocalIPs();
            const serverUrl = localIPs.length > 0 ? `http://${localIPs[0]}:${this.port}` : `http://localhost:${this.port}`;

            // Use pre-auth URL for instant access (no pairing step needed)
            const pwaUrl = this.generatePreAuthUrl(code) || `${serverUrl}?code=${code}`;

            return await QRCode.toDataURL(pwaUrl, {
                errorCorrectionLevel: 'H', // Higher error correction for better scanning
                type: 'image/png',
                quality: 0.92,
                margin: 2, // Larger margin for iPhone camera
                width: 300, // Larger size for better scanning
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

        // Reset timers

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
    statusBarItem.command = 'kim.openPanel';
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



    // Function to generate control panel HTML
    function getControlPanelHTML() {
        const config = vscode.workspace.getConfiguration('kim');
        const autoStartEnabled = config.get('autoStartServer', true);
        const serverStatus = embeddedServer ? 'running' : 'stopped';
        const serverPort = embeddedServer ? embeddedServer.port : config.get('serverPort', 8080);
        const currentCode = currentPairingCode || 'None';

        // Compute local URL
        let pwaUrl;
        const localIPs = embeddedServer ? embeddedServer.getLocalIPs() : [];
        const serverIp = localIPs.length > 0 ? localIPs[0] : 'localhost';
        pwaUrl = `http://${serverIp}:${serverPort}?code=${currentCode}`;

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>KIM Control Panel</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        padding: 20px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        margin: 0;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    .logo {
                        font-size: 3em;
                        margin-bottom: 10px;
                    }
                    .title {
                        font-size: 24px;
                        font-weight: bold;
                        margin: 0;
                    }
                    .subtitle {
                        color: var(--vscode-descriptionForeground);
                        margin: 5px 0 0 0;
                    }
                    .section {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    .section h3 {
                        margin: 0 0 15px 0;
                        color: var(--vscode-foreground);
                        font-size: 18px;
                    }
                    .status-indicator {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        border-radius: 6px;
                        font-weight: bold;
                        margin-bottom: 15px;
                    }
                    .status-running {
                        background: var(--vscode-testing-iconPassed);
                        color: white;
                    }
                    .status-stopped {
                        background: var(--vscode-testing-iconFailed);
                        color: white;
                    }
                    .button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        margin: 5px 5px 5px 0;
                        transition: background-color 0.2s;
                    }
                    .button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .button.secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .button.secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: auto 1fr;
                        gap: 10px 20px;
                        margin: 15px 0;
                    }
                    .info-label {
                        font-weight: bold;
                        color: var(--vscode-foreground);
                    }
                    .info-value {
                        color: var(--vscode-descriptionForeground);
                        font-family: monospace;
                    }
                    .checkbox-container {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin: 15px 0;
                    }
                    .checkbox {
                        width: 16px;
                        height: 16px;
                    }
                    .code-display {
                        background: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        padding: 15px;
                        text-align: center;
                        margin: 15px 0;
                    }
                    .code-number {
                        font-size: 32px;
                        font-weight: bold;
                        font-family: monospace;
                        color: var(--vscode-textLink-foreground);
                        letter-spacing: 4px;
                    }

                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">🚀</div>
                    <h1 class="title">Keep-It-Moving</h1>
                    <p class="subtitle">Remote Copilot Prompting Made Easy</p>
                </div>

                <div class="section">
                    <h3>📡 Server Status</h3>
                    <div class="status-indicator ${serverStatus === 'running' ? 'status-running' : 'status-stopped'}">
                        ${serverStatus === 'running' ? '🟢 Server Running' : '🔴 Server Stopped'}
                    </div>
                    
                    <div class="info-grid">
                        <span class="info-label">Port:</span>
                        <span class="info-value">${serverPort}</span>
                        <span class="info-label">Status:</span>
                        <span class="info-value">${serverStatus === 'running' ? 'Active and ready for connections' : 'Inactive'}</span>
                        ${serverStatus === 'running' ? `
                        <span class="info-label">PWA URL:</span>
                        <span class="info-value">http://localhost:${serverPort}</span>
                        ` : ''}
                    </div>

                    <button class="button" onclick="toggleServer()">
                        ${serverStatus === 'running' ? '🛑 Stop Server' : '🚀 Start Server'}
                    </button>
                </div>

                <div class="section">
                    <h3>🔗 Device Pairing</h3>
                    <div class="code-display">
                        <div>Current Pairing Code:</div>
                        <div class="code-number">${currentCode}</div>
                        <div style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 10px;">
                            ${currentCode === 'None' ? 'Generate a code to start pairing devices' : 'Share this code with your mobile device'}
                        </div>
                    </div>
                    
                    ${serverStatus === 'running' && currentCode !== 'None' ? `
                    <div class="qr-section" style="background: var(--vscode-textCodeBlock-background); border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 15px; margin: 15px 0; text-align: center;">
                        <div id="qrcode-container" style="margin-bottom: 15px;">
                            <div style="width: 200px; height: 200px; margin: 0 auto; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">
                                QR Code Loading...
                            </div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong>📱 Mobile URL:</strong>
                        </div>
                        <div style="background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 8px; font-family: monospace; font-size: 12px; word-break: break-all; margin-bottom: 10px;" id="mobile-url">
                            <span onclick="openPWAUrl()" style="color: var(--vscode-textLink-foreground); text-decoration: underline; cursor: pointer;" id="pwa-link">
                                ${pwaUrl}
                            </span>
                        </div>
                        <button class="button secondary" onclick="copyUrl()">📋 Copy URL</button>
                    </div>
                    ` : ''}
                    
                    <button class="button" onclick="generateCode()">🔢 Generate New Code</button>
                    ${serverStatus === 'running' && currentCode !== 'None' ?
                `<button class="button secondary" onclick="openPWA()">🌐 Open PWA (Auto-Paired)</button>` :
                ''
            }
                </div>

                <div class="section">
                    <h3>⚙️ Settings</h3>
                    <div class="checkbox-container">
                        <input type="checkbox" id="autoStart" class="checkbox" ${autoStartEnabled ? 'checked' : ''} onchange="updateAutoStart()">
                        <label for="autoStart">Auto-start server when VS Code opens</label>
                    </div>
                    
                    <p style="font-size: 12px; color: var(--vscode-descriptionForeground); margin: 10px 0 0 24px;">
                        When enabled, KIM will automatically start the server and be ready for device connections.
                    </p>
                </div>

                <div class="section">
                    <h3>📖 Quick Start</h3>
                    <ol style="color: var(--vscode-descriptionForeground); line-height: 1.6;">
                        <li><strong>Start the server</strong> using the button above ${serverStatus === 'running' ? '✅' : ''}</li>
                        <li><strong>Generate a pairing code</strong> for your device ${currentCode !== 'None' ? '✅' : ''}</li>
                        <li><strong>Open the PWA</strong> on your phone/tablet and enter the code</li>
                        <li><strong>Send prompts</strong> directly to Copilot from anywhere!</li>
                    </ol>
                    
                    ${serverStatus === 'running' && currentCode !== 'None' ? `
                    <div style="background: var(--vscode-inputValidation-infoBackground); border: 1px solid var(--vscode-inputValidation-infoBorder); border-radius: 6px; padding: 12px; margin-top: 15px;">
                        <strong>🎉 Ready to go!</strong> Your server is running and pairing code is active. 
                        <br>Open the PWA on your device and enter code <strong>${currentCode}</strong> to start sending prompts!
                    </div>
                    ` : ''}
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function toggleServer() {
                        vscode.postMessage({ command: 'toggleServer' });
                    }

                    function generateCode() {
                        vscode.postMessage({ command: 'generateCode' });
                    }

                    function copyUrl() {
                        const urlElement = document.getElementById('mobile-url');
                        if (urlElement) {
                            navigator.clipboard.writeText(urlElement.textContent.trim()).then(() => {
                                vscode.postMessage({ command: 'showMessage', text: '📋 URL copied to clipboard!' });
                            });
                        }
                    }



                    // Handle messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'updateQR':
                                const qrContainer = document.getElementById('qrcode-container');
                                const pwaLink = document.getElementById('pwa-link');
                                
                                if (qrContainer) {
                                    if (message.error) {
                                        qrContainer.innerHTML = \`
                                            <div style="width: 200px; height: 200px; margin: 0 auto; background: #f8f8f8; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #666;">
                                                ❌ QR Code Error
                                            </div>
                                        \`;
                                    } else if (message.qrCode) {
                                        qrContainer.innerHTML = \`
                                            <img src="\${message.qrCode}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px;" />
                                        \`;
                                        
                                        // Update the URL link if provided
                                        if (message.url && pwaLink) {
                                            pwaLink.textContent = message.url;
                                        }
                                    }
                                }
                                break;
                        }
                    });

                    // Generate QR code when page loads
                    window.addEventListener('load', () => {
                        const qrContainer = document.getElementById('qrcode-container');
                        if (qrContainer) {
                            setTimeout(() => vscode.postMessage({ command: 'generateQR' }), 100);
                        }
                    });

                    function openPWA() {
                        vscode.postMessage({ command: 'openPWA' });
                    }

                    function openPWAUrl() {
                        vscode.postMessage({ command: 'openPWA' });
                    }



                    function updateAutoStart() {
                        const enabled = document.getElementById('autoStart').checked;
                        vscode.postMessage({ 
                            command: 'updateAutoStart', 
                            enabled: enabled 
                        });
                    }

                    
                </script>
            </body>
            </html>
        `;
    }

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
        // Use pre-auth URL for instant access
        let pwaUrl = embeddedServer ? embeddedServer.generatePreAuthUrl(code) : null;
        if (!pwaUrl) {
            // Fallback to code-based URL (local only)
            pwaUrl = `http://${serverIp}:${currentServerPort}?code=${code}`;
        }

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
                        .url-link {
                            color: #3b82f6;
                            text-decoration: underline;
                            cursor: pointer;
                            display: inline-block;
                            padding: 4px 8px;
                            border-radius: 4px;
                            transition: all 0.2s ease;
                        }
                        .url-link:hover {
                            color: #60a5fa;
                            background-color: rgba(59, 130, 246, 0.1);
                            text-decoration: underline;
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
                            <strong>📱 Mobile URL:</strong><br>
                            <a href="#" id="urlLink" class="url-link">${pwaUrl}</a>
                        </div>
                        <button class="button" id="copyUrl">🔗 Copy PWA URL</button>
                        <button class="button" id="openUrl">🌐 Open in Browser</button>
                        <p style="font-size: 12px; margin-top: 10px; color: #888;">Click the URL above to open in your default browser, or scan the QR code with your phone</p>
                        
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
                        
                        document.getElementById('openUrl').addEventListener('click', () => {
                            vscode.postMessage({
                                command: 'openUrl',
                                url: '${pwaUrl}'
                            });
                        });
                        
                        document.getElementById('urlLink').addEventListener('click', (e) => {
                            e.preventDefault();
                            vscode.postMessage({
                                command: 'openUrl',
                                url: '${pwaUrl}'
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
                        case 'openUrl':
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
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

    // KIM Control Panel command
    let openPanel = vscode.commands.registerCommand('kim.openPanel', async function () {
        const panel = vscode.window.createWebviewPanel(
            'kimControlPanel',
            'KIM Control Panel 🚀',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = getControlPanelHTML();

        // Handle messages from the control panel
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'toggleServer':
                        await vscode.commands.executeCommand('kim.toggleServer');
                        // Refresh the panel
                        panel.webview.html = getControlPanelHTML();
                        break;
                    case 'generateCode':
                        // Generate new pairing code without opening a new panel
                        if (embeddedServer) {
                            const session = embeddedServer.generatePairingCode('vscode');
                            currentPairingCode = session.code;
                            vscode.window.showInformationMessage(`🔢 New pairing code generated: ${session.code}`);
                        }
                        // Refresh the control panel to show new code
                        panel.webview.html = getControlPanelHTML();
                        break;
                    case 'showQRCode':
                        await vscode.commands.executeCommand('kim.showPairingCode');
                        break;
                    case 'openPWA':
                        if (embeddedServer) {
                            const localIPs = embeddedServer.getLocalIPs();
                            const serverIp = localIPs.length > 0 ? localIPs[0] : 'localhost';
                            const pwaUrl = currentPairingCode ?
                                `http://${serverIp}:${embeddedServer.port}?code=${currentPairingCode}` :
                                `http://${serverIp}:${embeddedServer.port}`;
                            vscode.env.openExternal(vscode.Uri.parse(pwaUrl));
                        }
                        break;

                    case 'updateAutoStart':
                        const config = vscode.workspace.getConfiguration('kim');
                        await config.update('autoStartServer', message.enabled, vscode.ConfigurationTarget.Global);
                        vscode.window.showInformationMessage(`Auto-start ${message.enabled ? 'enabled' : 'disabled'} ✅`);
                        break;
                    // Internet access toggle removed; no-op preserved for backward compatibility
                    case 'generateQR':
                        if (embeddedServer && currentPairingCode) {
                            try {
                                // Use pre-auth URL for instant access
                                const pwaUrl = embeddedServer.generatePreAuthUrl(currentPairingCode) ||
                                    `http://localhost:${embeddedServer.port}?code=${currentPairingCode}`;

                                const qrCodeDataUrl = await QRCode.toDataURL(pwaUrl, {
                                    width: 200,
                                    margin: 1,
                                    color: {
                                        dark: '#000000',
                                        light: '#ffffff'
                                    }
                                });

                                // Send the QR code back to the webview
                                panel.webview.postMessage({
                                    command: 'updateQR',
                                    qrCode: qrCodeDataUrl,
                                    url: pwaUrl
                                });
                            } catch (error) {
                                console.error('❌ Failed to generate QR code:', error);
                                panel.webview.postMessage({
                                    command: 'updateQR',
                                    error: 'Failed to generate QR code'
                                });
                            }
                        }
                        break;

                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(showPairingCode, toggleServer, showStatus, injectPrompt, openPanel);

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

        // Generate pre-auth URL for instant access
        let pwaUrl = embeddedServer ? embeddedServer.generatePreAuthUrl(code) : null;
        if (!pwaUrl) {
            const config = vscode.workspace.getConfiguration('kim');
            const pwaPort = config.get('pwaPort', 3000);
            pwaUrl = `http://${serverIp}:${pwaPort}?code=${code}`;
        }

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