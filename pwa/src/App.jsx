import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useWebSocket } from './hooks/useWebSocket'
import { useDeviceDetection } from './hooks/useDeviceDetection'
import Header from './components/Header'
import PairingScreen from './screens/PairingScreen'
import PromptScreen from './screens/PromptScreen'
import StatusScreen from './screens/StatusScreen'
import Toast from './components/Toast'
import NotificationPermission from './components/NotificationPermission'
import DebugPanel from './components/DebugPanel'
import { getErrorMessage, successMessages, getRandomQuip } from './utils/errorMessages'
import StatusPersistence from './utils/statusPersistence'
import notifications from './utils/notifications'

function App() {
    const [isConnected, setIsConnected] = useState(false)
    const [isPaired, setIsPaired] = useState(false)
    const [token, setToken] = useState(null)
    const [toast, setToast] = useState(null)
    const deviceType = useDeviceDetection()

    // Initialize WebSocket connection
    const {
        connect,
        disconnect,
        sendMessage,
        connectionState
    } = useWebSocket({
        onConnected: () => {
            setIsConnected(true)
            StatusPersistence.saveConnectionState('connected')
            StatusPersistence.clearLastError()
            showToast(successMessages.connection.established, 'success', 2000)
            notifications.showConnectionSuccess()
        },
        onDisconnected: () => {
            setIsConnected(false)
            setIsPaired(false)
            StatusPersistence.saveConnectionState('disconnected')
            showToast('Connection lost - will try to reconnect 🔄', 'warning', 3000)
            notifications.showConnectionLost()
        },
        onPaired: (pairToken) => {
            setToken(pairToken)
            setIsPaired(true)
            StatusPersistence.clearLastError()
            showToast(successMessages.pairing.success, 'success')
            notifications.showPairingSuccess(deviceType)

            // Automatically redirect to prompt screen after successful pairing
            window.history.pushState(null, '', '/prompt')
        },
        onPromptDelivered: (message) => {
            showToast(`${successMessages.prompt.sent} ${getRandomQuip('success')}`, 'success')
            // Don't show notification for prompt delivery to avoid spam
        },
        onError: (error) => {
            const friendlyError = getErrorMessage(error, 'connection')
            showToast(friendlyError, 'error', 6000) // Show errors longer

            // Show notification for critical errors
            if (error.includes('failed after multiple attempts')) {
                notifications.showReconnectionFailed()
            } else {
                notifications.showError(friendlyError)
            }
        }
    })

    // Load saved state on startup and check for QR code parameters
    useEffect(() => {
        // Check URL for pairing code and server info from QR scan
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');
        const serverFromUrl = urlParams.get('server');
        const portFromUrl = urlParams.get('port');

        if (codeFromUrl) {
            console.log('🔗 QR code detected in URL:', codeFromUrl);
            console.log('🔗 Server info from URL:', { server: serverFromUrl, port: portFromUrl });
            console.log('🔗 Full URL:', window.location.href);
            console.log('🔗 URL params:', Object.fromEntries(urlParams.entries()));

            // Validate the code format
            if (!/^\d{6}$/.test(codeFromUrl)) {
                console.error('❌ Invalid code format from URL:', codeFromUrl);
                showToast(`❌ Invalid pairing code format: ${codeFromUrl}`, 'error', 5000);
                return;
            }

            // Clear the URL parameters to avoid reusing them on refresh
            window.history.replaceState({}, document.title, window.location.pathname);

            // Show enhanced toast with server info
            const serverInfo = serverFromUrl ? ` (${serverFromUrl}:${portFromUrl || '8080'})` : '';
            showToast(`🔗 QR code detected: ${codeFromUrl}${serverInfo}! Connecting...`, 'info', 4000);

            // Use the dedicated QR code pairing function with server info
            handleQRCodePairing(codeFromUrl, serverFromUrl, portFromUrl);

            return;
        }

        // Normal startup with saved token
        const savedToken = localStorage.getItem('kim-token')
        if (savedToken) {
            setToken(savedToken)
            // Try to reconnect with saved token
            connect()
        }

        // Check for previous errors and show recovery message
        const lastError = StatusPersistence.getLastError()
        if (lastError) {
            showToast(`Previous session: ${lastError.error} - Attempting recovery...`, 'info', 3000)
            StatusPersistence.clearLastError()
        }

        // Load connection state
        const lastConnectionState = StatusPersistence.getConnectionState()
        if (lastConnectionState === 'connected' && savedToken) {
            // Attempt auto-reconnection
            setTimeout(() => {
                if (!isConnected) {
                    connect()
                }
            }, 1000)
        }
    }, [])

    // Save token when it changes
    useEffect(() => {
        if (token) {
            localStorage.setItem('kim-token', token)
        } else {
            localStorage.removeItem('kim-token')
        }
    }, [token])

    const showToast = (message, type = 'info', duration = 4000) => {
        setToast({ message, type, duration })
        setTimeout(() => setToast(null), duration)

        // Save error for recovery
        if (type === 'error') {
            StatusPersistence.saveLastError(message, 'app')
        }
    }

    const handlePair = (code) => {
        console.log('🔗 handlePair called with code:', code);
        console.log('🔗 Connection state:', { isConnected, connectionState });

        // Validate code format
        if (!code || !/^\d{6}$/.test(code)) {
            const error = 'Invalid pairing code format. Must be 6 digits.';
            console.error('❌', error);
            showToast(`❌ ${error}`, 'error', 5000);
            return;
        }

        if (!isConnected) {
            console.log('📡 Not connected, attempting to connect first...');
            showToast('📡 Connecting to server first...', 'info', 2000);
            connect();

            // Wait a bit for connection, then try pairing
            setTimeout(() => {
                if (isConnected) {
                    console.log('✅ Connected after delay, now pairing...');
                    handlePair(code); // Retry after connection
                } else {
                    console.log('❌ Still not connected after delay');
                    showToast('❌ Connection failed. Please try manual pairing.', 'error', 5000);
                }
            }, 2000);
            return;
        }

        console.log('📤 Sending pairing message...');
        showToast(`🚀 Pairing with code ${code}...`, 'info', 2000);

        try {
            sendMessage({
                type: 'pair',
                code,
                deviceInfo: {
                    type: deviceType,
                    userAgent: navigator.userAgent,
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            console.error('❌ Failed to send pairing message:', error);
            showToast(`❌ Pairing failed: ${error.message}`, 'error', 5000);
        }
    }

    // Helper function for pairing from URL parameters (QR code scan)
    const handleQRCodePairing = (code, serverHost = null, serverPort = null) => {
        console.log('🔗 Starting QR code pairing process for code:', code);
        console.log('🔗 Server details:', { serverHost, serverPort });

        // Build custom server URL if provided
        let customServerUrl = null;
        if (serverHost) {
            const port = serverPort || '8080';
            customServerUrl = `ws://${serverHost}:${port}`;
            console.log('🎯 Using custom server URL from QR code:', customServerUrl);
        }

        // Show immediate feedback with server info
        const serverInfo = customServerUrl ? ` to ${serverHost}:${serverPort || '8080'}` : '';
        showToast(`🔗 QR code detected! Connecting${serverInfo}...`, 'info', 3000);

        // First ensure we're connected to the right server
        if (!isConnected) {
            console.log('📡 Not connected, attempting to connect with QR server info...');

            // Use the custom server URL from QR code if available
            connect(customServerUrl);

            // Wait for connection with enhanced feedback
            let attempts = 0;
            const maxAttempts = 24; // 12 seconds total with custom server

            const checkInterval = setInterval(() => {
                attempts++;

                if (isConnected) {
                    console.log('✅ Connected to server! Now attempting to pair...');
                    showToast(`✅ Connected${serverInfo}! Pairing with code ${code}...`, 'info', 2000);
                    handlePair(code);
                    clearInterval(checkInterval);
                } else if (attempts >= maxAttempts) {
                    console.log('❌ Connection timeout during QR pairing');
                    const timeoutMsg = customServerUrl
                        ? `❌ Could not connect to ${serverHost}:${serverPort || '8080'}. Please check VS Code extension is running.`
                        : '❌ Connection timeout. Please try manual pairing.';
                    showToast(timeoutMsg, 'error', 6000);
                    clearInterval(checkInterval);
                } else if (attempts % 4 === 0) {
                    // Show progress every 2 seconds
                    const progressMsg = customServerUrl
                        ? `🔄 Connecting to ${serverHost}... (${attempts / 2}s)`
                        : `🔄 Still connecting... (${attempts / 2}s)`;
                    showToast(progressMsg, 'info', 1000);
                }
            }, 500);
        } else {
            // Already connected, just pair
            console.log('✅ Already connected, pairing immediately...');
            showToast(`🚀 Pairing with code ${code}...`, 'info', 2000);
            handlePair(code);
        }
    }

    const handleSendPrompt = (prompt) => {
        if (!token || !isConnected) {
            showToast(getErrorMessage('Not connected', 'prompt'), 'error')
            return Promise.reject(new Error('Not connected'))
        }

        if (!prompt || prompt.trim().length === 0) {
            showToast(getErrorMessage('Empty prompt', 'prompt'), 'warning')
            return Promise.reject(new Error('Empty prompt'))
        }

        if (prompt.length > 1000) {
            showToast(getErrorMessage('Prompt too long', 'prompt'), 'warning')
            return Promise.reject(new Error('Prompt too long'))
        }

        try {
            sendMessage({
                type: 'prompt',
                token,
                prompt: prompt.trim()
            })

            // Save to prompt history for offline viewing
            const currentHistory = StatusPersistence.getPromptHistory()
            StatusPersistence.savePromptHistory([prompt.trim(), ...currentHistory])

            return Promise.resolve()
        } catch (error) {
            const friendlyError = getErrorMessage(error, 'prompt')
            showToast(friendlyError, 'error')
            return Promise.reject(error)
        }
    }

    const handleDisconnect = () => {
        disconnect()
        setToken(null)
        setIsPaired(false)
        showToast('👋 Disconnected from KIM server', 'info')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
            <Header
                isConnected={isConnected}
                isPaired={isPaired}
                deviceType={deviceType}
                onDisconnect={handleDisconnect}
                connectionState={connectionState}
                reconnectAttempts={0} // TODO: Get from useWebSocket
            />

            <main className="container mx-auto px-4 py-8">
                <Routes>
                    <Route
                        path="/"
                        element={
                            isPaired ?
                                <Navigate to="/prompt" replace /> :
                                <Navigate to="/pair" replace />
                        }
                    />
                    <Route
                        path="/pair"
                        element={
                            <PairingScreen
                                deviceType={deviceType}
                                onPair={handlePair}
                                isConnecting={connectionState === 'connecting'}
                            />
                        }
                    />
                    <Route
                        path="/prompt"
                        element={
                            isPaired ?
                                <PromptScreen
                                    onSendPrompt={handleSendPrompt}
                                    connectionState={connectionState}
                                    isConnected={isConnected}
                                /> :
                                <Navigate to="/pair" replace />
                        }
                    />
                    <Route
                        path="/status"
                        element={
                            <StatusScreen
                                isConnected={isConnected}
                                isPaired={isPaired}
                                deviceType={deviceType}
                                connectionState={connectionState}
                            />
                        }
                    />
                </Routes>
            </main>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <NotificationPermission />

            {/* Debug panel for development */}
            {process.env.NODE_ENV === 'development' && (
                <DebugPanel
                    isConnected={isConnected}
                    connectionState={connectionState}
                    onTestPairing={handlePair}
                />
            )}
        </div>
    )
}

export default App