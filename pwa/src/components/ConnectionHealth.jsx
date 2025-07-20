import React, { useState, useEffect } from 'react'

function ConnectionHealth({ connectionState, isConnected, reconnectAttempts = 0, maxAttempts = 10 }) {
    const [lastSeen, setLastSeen] = useState(Date.now())

    useEffect(() => {
        if (isConnected) {
            setLastSeen(Date.now())
        }
    }, [isConnected])

    const getHealthStatus = () => {
        if (connectionState === 'connected') {
            return {
                status: 'healthy',
                emoji: '🟢',
                message: 'Connected',
                color: 'text-kim-green'
            }
        }

        if (connectionState === 'connecting') {
            if (reconnectAttempts > 0) {
                const funnyReconnectMessages = [
                    'Knocking on the server door... 🚪',
                    'Sending digital carrier pigeons... 🐦',
                    'Asking nicely for connection... 🙏',
                    'Bribing the router with cookies... 🍪',
                    'Doing the connection dance... 💃'
                ];
                const message = reconnectAttempts <= 3
                    ? `Reconnecting... (${reconnectAttempts}/${maxAttempts})`
                    : funnyReconnectMessages[Math.min(reconnectAttempts - 4, funnyReconnectMessages.length - 1)];

                return {
                    status: 'reconnecting',
                    emoji: '🔄',
                    message,
                    color: 'text-kim-yellow'
                }
            }
            return {
                status: 'connecting',
                emoji: '🔗',
                message: 'Connecting...',
                color: 'text-kim-blue'
            }
        }

        if (reconnectAttempts >= maxAttempts) {
            return {
                status: 'failed',
                emoji: '❌',
                message: 'Connection took a permanent vacation 🏖️',
                color: 'text-kim-red'
            }
        }

        return {
            status: 'disconnected',
            emoji: '🔴',
            message: 'Disconnected',
            color: 'text-kim-red'
        }
    }

    const health = getHealthStatus()
    const timeSinceLastSeen = Math.floor((Date.now() - lastSeen) / 1000)

    return (
        <div className="flex items-center space-x-2 text-xs">
            <div className={`flex items-center space-x-1 ${health.color}`}>
                <span className={`emoji ${health.status === 'connecting' || health.status === 'reconnecting' ? 'animate-spin' : ''}`}>
                    {health.emoji}
                </span>
                <span>{health.message}</span>
            </div>

            {!isConnected && timeSinceLastSeen > 5 && (
                <span className="text-gray-400">
                    (last seen {timeSinceLastSeen}s ago)
                </span>
            )}

            {health.status === 'failed' && (
                <button
                    onClick={() => window.location.reload()}
                    className="text-kim-blue hover:text-kim-blue-light underline"
                >
                    Refresh
                </button>
            )}
        </div>
    )
}

export default ConnectionHealth