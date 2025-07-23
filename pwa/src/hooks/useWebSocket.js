import { useState, useRef, useCallback } from 'react'

export function useWebSocket({
    onConnected,
    onDisconnected,
    onPaired,
    onPromptDelivered,
    onError
}) {
    const [connectionState, setConnectionState] = useState('disconnected') // disconnected, connecting, connected
    const wsRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const reconnectAttempts = useRef(0)
    const heartbeatIntervalRef = useRef(null)
    const lastPongRef = useRef(Date.now())
    const offlineQueueRef = useRef([])
    const maxReconnectAttempts = 10
    const heartbeatInterval = 30000 // 30 seconds

    // Server discovery helper
    const tryServerDiscovery = async (fallbackUrl) => {
        try {
            const currentHost = window.location.hostname
            const discoveryUrl = `http://${currentHost}:8080/api/server-info`

            console.log('🔍 Trying server discovery:', discoveryUrl)

            const response = await fetch(discoveryUrl, {
                timeout: 2000,
                signal: AbortSignal.timeout(2000)
            })

            if (response.ok) {
                const serverInfo = await response.json()
                console.log('📡 Server discovery successful:', serverInfo)
                return serverInfo
            }
        } catch (error) {
            console.log('🔍 Server discovery failed, using fallback:', error.message)
        }
        return null
    }

    const connect = useCallback(async (customServerUrl = null) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return // Already connected
        }

        setConnectionState('connecting')

        try {
            // Enhanced server URL detection with multiple fallback strategies
            let serverUrl = customServerUrl || import.meta.env.VITE_KIM_SERVER_URL

            if (!serverUrl) {
                // Strategy 1: Check URL parameters for server info (from QR code)
                const urlParams = new URLSearchParams(window.location.search)
                const serverHost = urlParams.get('server') || urlParams.get('host')
                const serverPort = urlParams.get('port') || '8080'

                console.log('🔍 URL parameters detected:', { serverHost, serverPort })

                if (serverHost) {
                    serverUrl = `ws://${serverHost}:${serverPort}`
                    console.log('✅ Using server from QR code URL:', serverUrl)
                } else {
                    // Strategy 2: Auto-detect based on current page location
                    const currentHost = window.location.hostname
                    const wsPort = 8080 // Default WebSocket server port
                    serverUrl = `ws://${currentHost}:${wsPort}`
                    console.log('🔍 Auto-detecting server:', serverUrl)
                }
            }

            console.log('🔗 Attempting connection to KIM server:', serverUrl)

            // Try multiple connection strategies with fallbacks
            const connectionStrategies = [
                serverUrl, // Primary URL from QR code or detection
                `ws://localhost:8080`, // Localhost fallback
                `ws://127.0.0.1:8080`, // IP fallback
                `ws://${window.location.hostname}:8080`, // Current host fallback
                `ws://${window.location.hostname}:8081`, // Alternative port
                `ws://${window.location.hostname}:8082`  // Another alternative
            ]

            // Remove duplicates
            const uniqueStrategies = [...new Set(connectionStrategies)]
            console.log('🎯 Connection strategies:', uniqueStrategies)

            // Try each strategy
            for (let i = 0; i < uniqueStrategies.length; i++) {
                const tryUrl = uniqueStrategies[i]
                console.log(`🔗 Trying connection ${i + 1}/${uniqueStrategies.length}: ${tryUrl}`)

                try {
                    await attemptConnection(tryUrl)
                    console.log('✅ Connection successful with:', tryUrl)
                    return // Success!
                } catch (error) {
                    console.log(`❌ Connection failed for ${tryUrl}:`, error.message)
                    if (i === uniqueStrategies.length - 1) {
                        throw new Error('All connection strategies failed')
                    }
                    // Wait a bit before trying next strategy
                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            }

        } catch (error) {
            console.error('Failed to establish WebSocket connection:', error)
            setConnectionState('disconnected')
            onError?.('Failed to connect to KIM server. Please check that VS Code extension is running.')
        }
    }, [onConnected, onDisconnected, onError])

    // Helper function to attempt a single connection
    const attemptConnection = (serverUrl) => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(serverUrl)
            let resolved = false

            const cleanup = () => {
                if (!resolved) {
                    ws.close()
                }
            }

            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true
                    cleanup()
                    reject(new Error('Connection timeout'))
                }
            }, 3000) // 3 second timeout per attempt

            ws.onopen = () => {
                if (!resolved) {
                    resolved = true
                    clearTimeout(timeout)

                    // Success! Set up the real connection
                    wsRef.current = ws
                    setConnectionState('connected')
                    reconnectAttempts.current = 0
                    lastPongRef.current = Date.now()

                    // Set up event handlers for the successful connection
                    ws.onmessage = (event) => {
                        try {
                            const message = JSON.parse(event.data)
                            handleServerMessage(message)
                        } catch (error) {
                            console.error('Failed to parse server message:', error)
                        }
                    }

                    ws.onclose = (event) => {
                        console.log('🔌 Disconnected from KIM server', event.code, event.reason)
                        setConnectionState('disconnected')
                        stopHeartbeat()
                        onDisconnected?.()

                        // Auto-reconnect with exponential backoff
                        if (reconnectAttempts.current < maxReconnectAttempts) {
                            const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000)
                            const jitter = Math.random() * 1000

                            console.log(`🔄 Reconnecting in ${Math.round((delay + jitter) / 1000)}s (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`)

                            reconnectTimeoutRef.current = setTimeout(() => {
                                reconnectAttempts.current++
                                connect()
                            }, delay + jitter)
                        } else {
                            console.log('❌ Max reconnection attempts reached')
                            onError?.('Connection failed after multiple attempts. Please refresh the page.')
                        }
                    }

                    ws.onerror = (error) => {
                        console.error('WebSocket error:', error)
                        setConnectionState('disconnected')
                        onError?.('Connection error occurred')
                    }

                    // Start heartbeat
                    startHeartbeat()

                    // Process offline queue
                    processOfflineQueue()

                    onConnected?.()
                    resolve()
                }
            }

            ws.onerror = (error) => {
                if (!resolved) {
                    resolved = true
                    clearTimeout(timeout)
                    cleanup()
                    reject(error)
                }
            }
        })
    }

    wsRef.current.onopen = () => {
        console.log('🔗 Connected to KIM server')
        setConnectionState('connected')
        reconnectAttempts.current = 0
        lastPongRef.current = Date.now()

        // Start heartbeat
        startHeartbeat()

        // Process offline queue
        processOfflineQueue()

        onConnected?.()
    }

    wsRef.current.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data)
            handleServerMessage(message)
        } catch (error) {
            console.error('Failed to parse server message:', error)
        }
    }

    wsRef.current.onclose = (event) => {
        console.log('🔌 Disconnected from KIM server', event.code, event.reason)
        setConnectionState('disconnected')

        // Stop heartbeat
        stopHeartbeat()

        onDisconnected?.()

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(Math.pow(2, reconnectAttempts.current) * 1000, 30000) // Max 30 seconds
            const jitter = Math.random() * 1000 // Add jitter to prevent thundering herd

            console.log(`🔄 Reconnecting in ${Math.round((delay + jitter) / 1000)}s (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`)

            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttempts.current++
                connect()
            }, delay + jitter)
        } else {
            console.log('❌ Max reconnection attempts reached')
            onError?.('Connection failed after multiple attempts. Please refresh the page.')
        }
    }

    wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionState('disconnected')
        onError?.('Connection failed')
    }

} catch (error) {
    console.error('Failed to create WebSocket connection:', error)
    setConnectionState('disconnected')
    onError?.('Failed to connect to server')
}
    }, [onConnected, onDisconnected, onError])

const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
    }

    stopHeartbeat()

    if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
    }

    setConnectionState('disconnected')
    reconnectAttempts.current = 0
    offlineQueueRef.current = [] // Clear offline queue
}, [])

const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message))
    } else {
        // Queue message for when connection is restored
        if (message.type === 'prompt') {
            console.log('📥 Queueing message for offline delivery')
            offlineQueueRef.current.push({
                ...message,
                queuedAt: Date.now()
            })

            // Limit queue size
            if (offlineQueueRef.current.length > 10) {
                offlineQueueRef.current.shift() // Remove oldest
            }

            onError?.('Message queued - will send when reconnected 📥')
        } else {
            onError?.('Not connected to server')
        }
    }
}, [onError])

const startHeartbeat = () => {
    stopHeartbeat() // Clear any existing heartbeat

    heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Check if we've received a pong recently
            const timeSinceLastPong = Date.now() - lastPongRef.current
            if (timeSinceLastPong > heartbeatInterval * 2) {
                console.log('💔 Heartbeat timeout - connection may be dead')
                wsRef.current.close()
                return
            }

            // Send ping
            wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        }
    }, heartbeatInterval)
}

const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
    }
}

const processOfflineQueue = () => {
    if (offlineQueueRef.current.length > 0) {
        console.log(`📤 Processing ${offlineQueueRef.current.length} queued messages`)

        offlineQueueRef.current.forEach(message => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(message))
            }
        })

        offlineQueueRef.current = []
    }
}

const handleServerMessage = (message) => {
    switch (message.type) {
        case 'paired':
            onPaired?.(message.data?.token)
            break

        case 'prompt_delivered':
            onPromptDelivered?.(message.message)
            break

        case 'prompt_received':
            onPromptDelivered?.(message.message)
            break

        case 'pong':
            lastPongRef.current = Date.now()
            break

        case 'error':
            onError?.(message.message)
            break

        default:
            console.log('Unknown message type:', message.type)
    }
}

return {
    connect,
    disconnect,
    sendMessage,
    connectionState
}
}