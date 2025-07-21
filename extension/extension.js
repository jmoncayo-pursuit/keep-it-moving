// Keep-It-Moving (KIM) VS Code Extension
// Integrates with GitHub Copilot chat for prompt injection 🚀

const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

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

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'kim.showStatus';
    updateStatusBar('🔴 Disconnected');
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Show pairing code command
    let showPairingCode = vscode.commands.registerCommand('kim.showPairingCode', async function () {
        try {
            if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
                vscode.window.showErrorMessage('🔌 Server not connected! Start the server first.');
                return;
            }

            // Request pairing code from server
            wsConnection.send(JSON.stringify({
                type: 'generate_pairing_code',
                deviceType: 'vscode'
            }));

            // Show current pairing code if available
            if (currentPairingCode) {
                const result = await vscode.window.showInformationMessage(
                    `🔗 KIM Pairing Code: ${currentPairingCode}`,
                    { modal: false },
                    'Copy Code',
                    'Generate New'
                );

                if (result === 'Copy Code') {
                    await vscode.env.clipboard.writeText(currentPairingCode);
                    vscode.window.showInformationMessage('📋 Code copied to clipboard!');
                } else if (result === 'Generate New') {
                    vscode.commands.executeCommand('kim.showPairingCode');
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage('🐛 Failed to generate pairing code: ' + error.message);
        }
    });

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

    context.subscriptions.push(showPairingCode, toggleServer, showStatus, injectPrompt, connectCommand);

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
}

function handleServerMessage(message) {
    switch (message.type) {
        case 'pairing_code_generated':
            currentPairingCode = message.data.code;
            vscode.window.showInformationMessage(`🔗 New pairing code: ${currentPairingCode}`);
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
        statusBarItem.tooltip = tooltip || `Keep-It-Moving Status: ${text} - Click for details`;

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