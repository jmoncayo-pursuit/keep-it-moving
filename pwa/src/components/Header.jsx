import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import ConnectionHealth from './ConnectionHealth'

function Header({ isConnected, isPaired, deviceType, onDisconnect, connectionState, reconnectAttempts }) {
    const location = useLocation()

    const getStatusEmoji = () => {
        if (!isConnected) return '🔴'
        if (!isPaired) return '🟡'
        return '🟢'
    }

    const getDeviceEmoji = () => {
        switch (deviceType) {
            case 'phone': return '📱'
            case 'tablet': return '📱'
            case 'laptop': return '💻'
            default: return '📱'
        }
    }

    return (
        <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <h1 className="text-2xl font-bold text-white">
                            <span className="emoji">🚀</span> Keep-It-Moving
                        </h1>
                        <div className="flex items-center space-x-2 text-sm text-gray-300">
                            <span className="emoji">{getDeviceEmoji()}</span>
                        </div>
                        <ConnectionHealth
                            connectionState={connectionState}
                            isConnected={isConnected}
                            reconnectAttempts={reconnectAttempts}
                        />
                    </div>

                    <nav className="flex items-center space-x-4">
                        <Link
                            to="/pair"
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/pair'
                                ? 'bg-kim-blue text-white'
                                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                                }`}
                        >
                            Pair
                        </Link>

                        {isPaired && (
                            <Link
                                to="/prompt"
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/prompt'
                                    ? 'bg-kim-blue text-white'
                                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                                    }`}
                            >
                                Prompt
                            </Link>
                        )}

                        <Link
                            to="/status"
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/status'
                                ? 'bg-kim-blue text-white'
                                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                                }`}
                        >
                            Status
                        </Link>

                        {isPaired && (
                            <button
                                onClick={onDisconnect}
                                className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors"
                            >
                                Disconnect
                            </button>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    )
}

export default Header