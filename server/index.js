// Keep-It-Moving (KIM) Relay Server
// Local WebSocket server for relaying prompts to VS Code Copilot 🚀

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const PWAServer = require('./pwa-server');

/**
 * KIM Relay Server - The heart of local-first prompt relaying! 🚀
 * Handles WebSocket connections between devices and VS Code with joyful emoji feedback
 */
class KIMRelayServer {
    /**
     * @param {number|string} port - Server port (default: 8080)
     */
    constructor(port = process.env.KIM_PORT || 8080) {
        this.port = parseInt(port);
        this.wss = null;
        /** @type {Map<string, WebSocket>} token -> client connection */
        this.clients = new Map();
        /** @type {Map<string, Object>} code -> { token, expires, deviceType } */
        this.pairingSessions = new Map();
        this.vsCodeConnection = null;
        this.pwaServer = null;
    }

    /**
     * Try to start server on the specified port, with automatic fallback
     */
    async tryStartOnPort(port, maxRetries = 5) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const testPort = port + attempt;
                if (process.env.NODE_ENV !== 'test') {
                    console.log(`🔍 Trying port ${testPort}...`);
                }

                return new Promise((resolve, reject) => {
                    const server = new WebSocket.Server({
                        port: testPort,
                        host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
                    });

                    server.on('listening', () => {
                        this.port = testPort;
                        this.wss = server;
                        resolve(server);
                    });

                    server.on('error', (error) => {
                        if (error.code === 'EADDRINUSE') {
                            if (process.env.NODE_ENV !== 'test') {
                                console.log(`⚠️ Port ${testPort} in use, trying next...`);
                            }
                            server.close();
                            if (attempt === maxRetries - 1) {
                                reject(new Error(`All ports from ${port} to ${port + maxRetries - 1} are in use`));
                            } else {
                                resolve(null); // Try next port
                            }
                        } else {
                            reject(error);
                        }
                    });
                });
            } catch (error) {
                if (attempt === maxRetries - 1) {
                    throw error;
                }
            }
        }
    }

    async start() {
        if (process.env.NODE_ENV !== 'test') {
            console.log('🚀 KIM Relay Server starting up...');
        }

        // Try to start on the specified port with automatic fallback
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            try {
                const testPort = this.port + attempts;
                if (process.env.NODE_ENV !== 'test') {
                    console.log(`🔍 Trying port ${testPort}...`);
                }

                this.wss = new WebSocket.Server({
                    port: testPort,
                    host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
                });

                this.port = testPort;
                break; // Success!

            } catch (error) {
                if (error.code === 'EADDRINUSE') {
                    attempts++;
                    if (process.env.NODE_ENV !== 'test') {
                        console.log(`⚠️ Port ${this.port + attempts - 1} in use, trying next...`);
                    }
                    if (attempts >= maxAttempts) {
                        const funnyErrors = [
                            "All the good ports are having a party without us! 🎉",
                            "Ports are playing hide and seek! 🙈",
                            "Time to find a new neighborhood for our server! 🏠"
                        ];
                        const randomError = funnyErrors[Math.floor(Math.random() * funnyErrors.length)];
                        throw new Error(`${randomError} (Ports ${this.port}-${this.port + maxAttempts - 1} are busy)`);
                    }
                } else {
                    throw error;
                }
            }
        }

        this.wss.on('connection', (ws, req) => {
            if (process.env.NODE_ENV !== 'test') {
                console.log('📱 New connection from:', req.socket.remoteAddress);
            }

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(ws, message);
                } catch (error) {
                    console.error('🐛 Message parsing error:', error);
                    this.sendError(ws, 'Invalid message format', '🐛');
                }
            });

            ws.on('close', () => {
                if (process.env.NODE_ENV !== 'test') {
                    console.log('👋 Client disconnected');
                }

                // Check if this was the VS Code extension
                if (ws.isVSCodeExtension) {
                    console.log('🔌 VS Code extension disconnected');
                    this.vsCodeConnection = null;
                }

                this.removeClient(ws);
            });

            ws.on('error', (error) => {
                console.error('🐛 WebSocket error:', error);
            });
        });

        // Start periodic cleanup of expired tokens (every 5 minutes)
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredTokens();
        }, 5 * 60 * 1000);

        console.log(`🎉 KIM Server running on ws://localhost:${this.port}`);
        console.log('📡 Ready to relay prompts with emoji magic!');

        // Start PWA server on port 3000 (or next available)
        this.pwaServer = new PWAServer(3000);
        this.pwaServer.start();
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
                this.sendResponse(ws, 'pong', true, 'Connection alive', '💓', null, {
                    timestamp: message.timestamp || Date.now(),
                    serverTime: Date.now()
                });
                break;

            case 'get_pairing_sessions':
                // For VS Code extension to get active pairing sessions
                const sessions = this.getActivePairingSessions();
                this.sendResponse(ws, 'pairing_sessions', true, 'Active sessions', '📋', null, { sessions });
                break;

            case 'generate_pairing_code':
                // For VS Code extension to generate new pairing codes
                const { deviceType = 'unknown' } = message;
                const newSession = this.generatePairingCode(deviceType);
                this.sendResponse(ws, 'pairing_code_generated', true, 'New pairing code', '🔢', null, {
                    code: newSession.code,
                    expiresIn: Math.ceil((newSession.expires - Date.now()) / 1000)
                });
                break;

            case 'register_extension':
                // Register VS Code extension connection
                ws.isVSCodeExtension = true;
                this.vsCodeConnection = ws; // Store reference for easy access
                this.sendResponse(ws, 'extension_registered', true, 'VS Code extension connected', '🔗');
                console.log('🔗 VS Code extension registered and stored');
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

        // Mark session as used
        session.isActive = false;

        // Store client connection with token
        this.clients.set(session.token, ws);
        ws.kimToken = session.token;

        // Store token session for 24-hour management
        this.storeTokenSession(session.token, deviceInfo);

        // Send success response with token and fun quip
        const pairingQuips = [
            "Welcome to the coding party! 🎉",
            "Your device is now part of the squad! 👥",
            "Connection established, let's code! 💻",
            "Ready to relay some awesome prompts! ⚡",
            "You're officially in the KIM family! 👨‍👩‍👧‍👦",
            "Time to make some coding magic! ✨",
            "Pairing successful - let the coding adventures begin! 🚀",
            "Device linked and ready to rock! 🎸",
            "Connection complete - your coding sidekick is ready! 🦸‍♂️"
        ];
        const randomQuip = pairingQuips[Math.floor(Math.random() * pairingQuips.length)];

        this.sendResponse(ws, 'paired', true, 'Device paired successfully!', '🚀', randomQuip, {
            token: session.token,
            expiresIn: 24 * 60 * 60 // 24 hours in seconds
        });

        console.log('🔗 Device paired successfully:', {
            code,
            token: session.token.substring(0, 8) + '...',
            deviceType: session.deviceType
        });

        // Notify VS Code extension about successful pairing
        this.notifyVSCodePairing(session);
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

        // Send confirmation to device
        this.sendResponse(ws, 'prompt_received', true, 'Prompt received!', '📤');

        // Relay to VS Code (placeholder for now)
        this.relayToVSCode(prompt, token);

        console.log('📨 Prompt relayed:', prompt.substring(0, 50) + '...');
    }

    relayToVSCode(prompt, token) {
        console.log('🎯 Relaying to VS Code:', { prompt, token: token.substring(0, 8) + '...' });

        // Check if we have a VS Code extension connection
        let vsCodeExtension = this.vsCodeConnection;

        // Fallback: search through all connections
        if (!vsCodeExtension || vsCodeExtension.readyState !== WebSocket.OPEN) {
            console.log('🔍 Searching for VS Code extension connection...');
            for (const [, ws] of this.clients.entries()) {
                if (ws.isVSCodeExtension && ws.readyState === WebSocket.OPEN) {
                    vsCodeExtension = ws;
                    this.vsCodeConnection = ws; // Update reference
                    break;
                }
            }
        }

        if (vsCodeExtension && vsCodeExtension.readyState === WebSocket.OPEN) {
            console.log('✅ Found VS Code extension, sending prompt...');
            // Generate a fun quip for the prompt
            const quips = [
                "Fresh from the mobile command center! 📱",
                "Incoming transmission from the field! 📡",
                "Your remote coding buddy says hi! 👋",
                "Delivered with extra emoji love! 💝",
                "Coded with passion, delivered with style! ✨",
                "Your mobile coding companion strikes again! ⚡",
                "Beaming up some coding wisdom! 🛸",
                "Hot off the mobile development press! 📰",
                "Crafted with care on the go! 🎨",
                "Your pocket-sized coding assistant! 📱"
            ];
            const randomQuip = quips[Math.floor(Math.random() * quips.length)];

            // Send prompt to VS Code extension
            const relayMessage = {
                type: 'prompt_relay',
                data: {
                    prompt,
                    quip: randomQuip,
                    sourceToken: token.substring(0, 8) + '...'
                },
                timestamp: Date.now()
            };

            vsCodeExtension.send(JSON.stringify(relayMessage));

            // Confirm delivery to the original client
            setTimeout(() => {
                const client = this.clients.get(token);
                if (client) {
                    this.sendResponse(client, 'prompt_delivered', true, 'Delivered to Copilot!', '🚀', randomQuip);
                }
            }, 200);
        } else {
            // No VS Code extension connected
            console.log('⚠️ No VS Code extension connected');
            const client = this.clients.get(token);
            if (client) {
                this.sendResponse(client, 'prompt_failed', false, 'VS Code not connected', '🔌');
            }
        }
    }

    generatePairingCode(deviceType = 'unknown') {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const token = uuidv4();
        const expires = Date.now() + (10 * 60 * 1000); // 10 minutes
        const createdAt = Date.now();

        const session = {
            code,
            token,
            expires,
            createdAt,
            deviceType,
            isActive: true
        };

        this.pairingSessions.set(code, session);

        console.log('🔢 Generated pairing code:', code, 'for device type:', deviceType);
        return session;
    }

    // Get all active pairing sessions (for VS Code extension display)
    getActivePairingSessions() {
        const now = Date.now();
        const activeSessions = [];

        for (const [code, session] of this.pairingSessions.entries()) {
            if (session.isActive && now < session.expires) {
                activeSessions.push({
                    code,
                    deviceType: session.deviceType,
                    expiresIn: Math.ceil((session.expires - now) / 1000),
                    createdAt: session.createdAt
                });
            } else if (now >= session.expires) {
                // Clean up expired sessions
                this.pairingSessions.delete(code);
            }
        }

        return activeSessions;
    }

    // Validate pairing code and return session info
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

    // Store token with 24-hour expiry for session management
    storeTokenSession(token, deviceInfo = {}) {
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

        this.tokenSessions = this.tokenSessions || new Map();
        this.tokenSessions.set(token, {
            token,
            createdAt: Date.now(),
            expiresAt,
            deviceInfo,
            lastActivity: Date.now()
        });

        console.log('💾 Stored token session:', token.substring(0, 8) + '...', 'expires in 24h');
    }

    validateToken(token) {
        // Check if client is connected
        if (!this.clients.has(token)) {
            return false;
        }

        // Check token session expiry
        if (this.tokenSessions && this.tokenSessions.has(token)) {
            const session = this.tokenSessions.get(token);
            if (Date.now() > session.expiresAt) {
                // Clean up expired token
                this.tokenSessions.delete(token);
                this.clients.delete(token);
                return false;
            }

            // Update last activity
            session.lastActivity = Date.now();
            return true;
        }

        return this.clients.has(token);
    }

    // Clean up expired tokens periodically
    cleanupExpiredTokens() {
        if (!this.tokenSessions) return;

        const now = Date.now();
        for (const [token, session] of this.tokenSessions.entries()) {
            if (now > session.expiresAt) {
                console.log('🧹 Cleaning up expired token:', token.substring(0, 8) + '...');
                this.tokenSessions.delete(token);
                this.clients.delete(token);
            }
        }
    }

    // Notify VS Code extension about pairing events
    notifyVSCodePairing(session) {
        // TODO: Implement VS Code extension communication
        console.log('📢 Notifying VS Code about pairing:', {
            deviceType: session.deviceType,
            token: session.token.substring(0, 8) + '...'
        });
    }

    removeClient(ws) {
        if (ws.kimToken) {
            this.clients.delete(ws.kimToken);
        }
    }

    sendResponse(ws, type, success, message, emoji, quip = null, data = null) {
        const response = {
            type,
            success,
            message,
            emoji,
            timestamp: Date.now()
        };

        if (quip) {
            response.quip = quip;
        }

        if (data) {
            response.data = data;
        }

        ws.send(JSON.stringify(response));
    }

    sendError(ws, message, emoji) {
        this.sendResponse(ws, 'error', false, message, emoji);
    }

    stop() {
        if (this.wss) {
            console.log('🛑 Stopping KIM Relay Server...');

            // Stop PWA server too
            if (this.pwaServer) {
                this.pwaServer.stop();
                this.pwaServer = null;
            }
            this.wss.close();
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new KIMRelayServer();
    server.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down gracefully...');
        server.stop();
        process.exit(0);
    });
}

module.exports = KIMRelayServer;