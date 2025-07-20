import React from 'react'

function StatusScreen({ isConnected, isPaired, deviceType, connectionState }) {
    const getConnectionEmoji = () => {
        switch (connectionState) {
            case 'connected': return '🟢'
            case 'connecting': return '🟡'
            case 'disconnected': return '🔴'
            default: return '⚪'
        }
    }

    const getDeviceEmoji = () => {
        switch (deviceType) {
            case 'phone': return '📱'
            case 'tablet': return '📱'
            case 'laptop': return '💻'
            default: return '📱'
        }
    }

    const statusItems = [
        {
            label: 'Connection',
            value: connectionState,
            emoji: getConnectionEmoji(),
            description: isConnected ? 'Connected to KIM server' : 'Not connected'
        },
        {
            label: 'Pairing',
            value: isPaired ? 'paired' : 'not paired',
            emoji: isPaired ? '🔗' : '🔓',
            description: isPaired ? 'Ready to send prompts' : 'Need to pair with VS Code'
        },
        {
            label: 'Device',
            value: deviceType,
            emoji: getDeviceEmoji(),
            description: `Detected as ${deviceType}`
        },
        {
            label: 'Server',
            value: 'localhost:8080',
            emoji: '🖥️',
            description: 'Local KIM relay server'
        }
    ]

    return (
        <div className="max-w-lg mx-auto">
            <div className="kim-card">
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        <span className="emoji">📊</span> Status
                    </h2>
                    <p className="text-gray-300">
                        Current connection and device status
                    </p>
                </div>

                <div className="space-y-4">
                    {statusItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <span className="text-2xl emoji">{item.emoji}</span>
                                <div>
                                    <div className="font-medium text-white">{item.label}</div>
                                    <div className="text-sm text-gray-400">{item.description}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-sm text-kim-blue capitalize">
                                    {item.value}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Overall Status */}
                <div className="mt-6 p-4 rounded-lg text-center">
                    {isPaired ? (
                        <div className="text-kim-green">
                            <div className="text-4xl emoji mb-2">🚀</div>
                            <div className="font-bold">Ready to Code!</div>
                            <div className="text-sm text-gray-300">
                                You can now send prompts to VS Code Copilot
                            </div>
                        </div>
                    ) : isConnected ? (
                        <div className="text-kim-yellow">
                            <div className="text-4xl emoji mb-2">🔗</div>
                            <div className="font-bold">Almost There!</div>
                            <div className="text-sm text-gray-300">
                                Connected to server, but not paired with VS Code yet
                            </div>
                        </div>
                    ) : (
                        <div className="text-kim-red">
                            <div className="text-4xl emoji mb-2">🔌</div>
                            <div className="font-bold">Not Connected</div>
                            <div className="text-sm text-gray-300">
                                Make sure the KIM server is running in VS Code
                            </div>
                        </div>
                    )}
                </div>

                {/* Debug Info */}
                <details className="mt-6">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                        <span className="emoji">🐛</span> Debug Info
                    </summary>
                    <div className="mt-2 p-3 bg-gray-800 rounded text-xs font-mono text-gray-400">
                        <div>User Agent: {navigator.userAgent}</div>
                        <div>Screen: {window.screen.width}x{window.screen.height}</div>
                        <div>Viewport: {window.innerWidth}x{window.innerHeight}</div>
                        <div>Timestamp: {new Date().toISOString()}</div>
                    </div>
                </details>
            </div>
        </div>
    )
}

export default StatusScreen