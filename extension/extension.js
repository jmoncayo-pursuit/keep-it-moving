// Keep-It-Moving (KIM) VS Code Extension
// Integrates with GitHub Copilot chat for prompt injection 🚀

const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');
const QRCode = require('qrcode');

let kimServer = null;
let serverPort = 8080;
let wsConnection = null;
let currentPairingCode = null;
let statusBarItem = null;

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
    statusBarItem.show();

    // Register hover provider for status bar
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
            // Auto-start server if not running
            if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
                vscode.window.showInformationMessage('🚀 Starting KIM server...');
                await vscode.commands.executeCommand('kim.toggleServer');

                // Wait for server to start
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
                    vscode.window.showErrorMessage('🔌 Server failed to start! Please try again.');
                    return;
                }
            }

            // Request pairing code from server
            wsConnection.send(JSON.stringify({
                type: 'generate_pairing_code',
                deviceType: 'vscode'
            }));

            // Show current pairing code if available
            if (currentPairingCode) {
                await showPairingCodePanel(currentPairingCode);
            }
        } catch (error) {
            vscode.window.showErrorMessage('🐛 Failed to generate pairing code: ' + error.message);
        }
    });

    // Function to show pairing code in a panel with QR code
    async function showPairingCodePanel(code) {
        // Create and show panel
        const panel = vscode.window.createWebviewPanel(
            'kimPairingCode',
            'KIM Pairing Code',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

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
            const serverUrl = `http://${serverIp}:${serverPort}`;

            // Generate direct URL for QR code
            // This URL will open the PWA and include the pairing code as a parameter
            const pwaUrl = `http://${serverIp}:${serverPort}?code=${code}`;

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
            panel.webview.html = `
                <html>
                <body>
                    <h1>Failed to generate QR code</h1>
                    <p>Error: ${error.message}</p>
                    <p>Pairing code: ${code}</p>
                </body>
                </html>
            `;
        }
    }

    // Toggle server command
    let toggleServer = vscode.commands.registerCommand('kim.toggleServer', async function () {
        if (kimServer) {
            // Stop server and disconnect WebSocket
            disconnectFromServer();
            kimServer.kill();
            kimServer = null;
            updateStatusBar('🔴 Disconnected');
            vscode.window.showInformationMessage('🛑 KIM Server stopped');
        } else {
            // Start server
            try {
                const serverPath = path.join(__dirname, '..', 'server', 'index.js');
                kimServer = spawn('node', [serverPath], {
                    cwd: path.dirname(serverPath),
                    stdio: 'pipe'
                });

                kimServer.on('error', (error) => {
                    vscode.window.showErrorMessage('🐛 Server failed to start: ' + error.message);
                    kimServer = null;
                    updateStatusBar('🔴 Error');
                });

                kimServer.on('exit', (code) => {
                    if (code !== 0) {
                        vscode.window.showWarningMessage(`⚠️ Server exited with code ${code}`);
                    }
                    kimServer = null;
                    disconnectFromServer();
                    updateStatusBar('🔴 Disconnected');
                });

                // Wait a moment for server to start, then connect
                setTimeout(() => {
                    connectToServer();
                }, 1000);

                vscode.window.showInformationMessage(`🚀 KIM Server started on port ${serverPort}`);
            } catch (error) {
                vscode.window.showErrorMessage('🐛 Failed to start server: ' + error.message);
                updateStatusBar('🔴 Error');
            }
        }
    });

    // Show status command
    let showStatus = vscode.commands.registerCommand('kim.showStatus', function () {
        const serverStatus = kimServer ? '🟢 Running' : '🔴 Stopped';
        const connectionStatus = wsConnection && wsConnection.readyState === WebSocket.OPEN ? '🟢 Connected' : '🔴 Disconnected';
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

    // Connect to server command
    let connectCommand = vscode.commands.registerCommand('kim.connectToServer', function () {
        connectToServer();
        vscode.window.showInformationMessage('🔗 Attempting to connect to KIM server...');
    });

    // Show mini QR code command
    let showMiniQRCommand = vscode.commands.registerCommand('kim.showMiniQR', async function () {
        if (!currentPairingCode) {
            vscode.window.showInformationMessage('No pairing code available. Generate one first with "KIM: Show Pairing Code"');
            return;
        }

        try {
            // Get hover with QR code
            const hover = await createQRCodeHover(currentPairingCode);

            // Show notification with pairing code
            vscode.window.showInformationMessage(
                `🔗 KIM Pairing Code: ${currentPairingCode}`,
                { modal: false },
                'Copy Code',
                'Show Full QR'
            ).then(selection => {
                if (selection === 'Copy Code') {
                    vscode.env.clipboard.writeText(currentPairingCode);
                    vscode.window.showInformationMessage('📋 Code copied to clipboard!');
                } else if (selection === 'Show Full QR') {
                    vscode.commands.executeCommand('kim.showPairingCode');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage('Failed to create QR code: ' + error.message);
        }
    });

    context.subscriptions.push(showPairingCode, toggleServer, showStatus, injectPrompt, connectCommand, showMiniQRCommand);

    // Auto-start server on activation if configured
    const autoStart = config.get('autoStartServer', false);
    if (autoStart) {
        vscode.commands.executeCommand('kim.toggleServer');
    } else {
        // Always try to connect to existing server
        vscode.window.showInformationMessage('🔍 Scanning for KIM server... 📡');
        setTimeout(() => {
            connectToServer();
        }, 1000);
    }

    // Force connection attempt
    connectToServer();
}

// WebSocket connection management
function connectToServer(retryPort = null) {
    const targetPort = retryPort || serverPort;

    try {
        console.log(`🔌 Attempting to connect to KIM server on ws://localhost:${targetPort}`);
        if (!retryPort) {
            vscode.window.showInformationMessage(`🔌 Attempting to connect to KIM server on port ${targetPort}...`);
        }

        wsConnection = new WebSocket(`ws://localhost:${targetPort}`);

        wsConnection.on('open', () => {
            console.log('🔗 Connected to KIM server');
            updateStatusBar('🟢 Connected');

            const connectionQuips = [
                '🎉 KIM is ready to relay your prompts!',
                '⚡ Connection established - let the coding magic begin!',
                '🚀 Houston, we have connection! Ready for prompt liftoff!',
                '🎯 Locked and loaded - your coding sidekick is online!',
                '✨ Connection sparkles activated - ready to code!'
            ];
            const randomQuip = connectionQuips[Math.floor(Math.random() * connectionQuips.length)];
            vscode.window.showInformationMessage(randomQuip);

            // Register as VS Code extension
            const registrationMessage = {
                type: 'register_extension',
                clientType: 'vscode',
                timestamp: Date.now()
            };
            console.log('📤 Sending registration message:', JSON.stringify(registrationMessage));
            wsConnection.send(JSON.stringify(registrationMessage));
        });

        wsConnection.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📩 Received message from server:', JSON.stringify(message));

                // Only show notification for important messages, not all messages
                if (message.type === 'prompt_relay') {
                    vscode.window.showInformationMessage(`📩 Prompt received: "${message.data.prompt.substring(0, 30)}..."`);
                } else if (message.type === 'extension_registered') {
                    vscode.window.showInformationMessage('🔗 Extension registered with server!');
                }

                handleServerMessage(message);
            } catch (error) {
                console.error('Failed to parse server message:', error);
                vscode.window.showErrorMessage(`Failed to parse server message: ${error.message}`);
            }
        });

        wsConnection.on('close', () => {
            console.log('🔌 Disconnected from KIM server');
            updateStatusBar('🔴 Disconnected');
            wsConnection = null;

            // Auto-reconnect after 3 seconds if server was running
            if (kimServer) {
                setTimeout(() => {
                    vscode.window.showInformationMessage('☕ Reconnecting to KIM server...');
                    connectToServer();
                }, 3000);
            }
        });

        wsConnection.on('error', (error) => {
            console.error('WebSocket error:', error);
            updateStatusBar('🔴 Error');

            // Only show error message if this wasn't an initial connection attempt
            if (kimServer) {
                vscode.window.showWarningMessage('🐛 KIM connection hiccup - trying to reconnect!');
            } else {
                // Silent fail for initial connection attempt - server might not be running
                console.log('🔍 No existing server found - that\'s okay!');
            }
        });

    } catch (error) {
        console.error('Failed to connect to server:', error);
        updateStatusBar('🔴 Error');
    }
}

function disconnectFromServer() {
    if (wsConnection) {
        wsConnection.close();
        wsConnection = null;
    }
    currentPairingCode = null;

    // Update status bar to remove QR hint
    updateStatusBar('🔴 Disconnected');
}

function handleServerMessage(message) {
    switch (message.type) {
        case 'pairing_code_generated':
            currentPairingCode = message.data.code;
            vscode.commands.executeCommand('kim.showPairingCode');
            // Update status bar to indicate QR code is available
            updateStatusBar('🟢 Connected', 'Pairing code ready - Hover for QR code');
            break;

        case 'prompt_relay':
            // Inject the received prompt into Copilot
            const prompt = message.data.prompt;
            const quip = message.data.quip;
            vscode.commands.executeCommand('kim.injectPrompt', prompt, quip);

            // Update status bar with activity indicator
            updateStatusBar('🟢 Active', 'Prompt received and delivered to Copilot');

            // Reset status after a few seconds
            setTimeout(() => {
                updateStatusBar('🟢 Connected', 'Ready to receive prompts');
            }, 3000);
            break;

        case 'device_paired':
            const deviceType = message.data.deviceType || 'device';
            vscode.window.showInformationMessage(`📱 ${deviceType} paired successfully!`);
            updateStatusBar('🟢 Connected', `${deviceType} paired and ready`);
            break;

        case 'error':
            vscode.window.showErrorMessage(`🐛 Server error: ${message.message}`);
            break;

        default:
            console.log('Unknown message type:', message.type);
    }
}

function updateStatusBar(text, tooltip = null) {
    if (statusBarItem) {
        statusBarItem.text = `KIM ${text}`;

        // If we have a pairing code, add QR hint to tooltip
        if (currentPairingCode) {
            statusBarItem.tooltip = tooltip || `Keep-It-Moving Status: ${text} - Hover for QR code or click for details`;
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
        const pwaUrl = `http://${serverIp}:${serverPort}?code=${code}`;

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

    // Clean up server process
    if (kimServer) {
        kimServer.kill();
        kimServer = null;
    }
}

module.exports = {
    activate,
    deactivate
};