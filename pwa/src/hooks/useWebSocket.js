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

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return // Already connected
        }

        setConnectionState('connecting')

        try {
            // Try to connect to server (use environment variable or default to localhost)
            const serverUrl = import.meta.env.VITE_KIM_SERVER_URL || 'ws://localhost:8080'
            wsRef.current = new WebSocket(serverUrl)

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