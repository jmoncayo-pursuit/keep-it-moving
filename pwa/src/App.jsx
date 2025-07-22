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
        // Check URL for pairing code from QR scan
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');

        if (codeFromUrl) {
            // Clear the URL parameter to avoid reusing it on refresh
            window.history.replaceState({}, document.title, window.location.pathname);

            // Show toast to indicate we're processing the QR code
            showToast('QR code detected! Connecting...', 'info');

            // Connect and pair with the code from URL
            connect();

            // Wait a moment for connection to establish
            setTimeout(() => {
                if (isConnected) {
                    handlePair(codeFromUrl);
                } else {
                    showToast('Connecting to server...', 'info');
                    // Try again after connection
                    const checkInterval = setInterval(() => {
                        if (isConnected) {
                            handlePair(codeFromUrl);
                            clearInterval(checkInterval);
                        }
                    }, 500);

                    // Stop checking after 10 seconds
                    setTimeout(() => clearInterval(checkInterval), 10000);
                }
            }, 500);

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
        if (!isConnected) {
            connect()
        }
        sendMessage({
            type: 'pair',
            code,
            deviceInfo: {
                type: deviceType,
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            }
        })
    }

    // Helper function for pairing from URL parameters (QR code scan)
    const handleQRCodePairing = (code) => {
        // First ensure we're connected
        if (!isConnected) {
            // Try to connect first
            connect();

            // Wait for connection and then pair
            const checkInterval = setInterval(() => {
                if (isConnected) {
                    handlePair(code);
                    clearInterval(checkInterval);
                }
            }, 500);

            // Stop checking after 10 seconds
            setTimeout(() => clearInterval(checkInterval), 10000);
        } else {
            // Already connected, just pair
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
        </div>
    )
}

export default App