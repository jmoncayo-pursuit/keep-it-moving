import React, { useState } from 'react'

function DebugPanel({ isConnected, connectionState, onTestPairing }) {
    const [testCode, setTestCode] = useState('123456')
    const [showDebug, setShowDebug] = useState(false)

    if (!showDebug) {
        return (
            <div className="fixed bottom-4 right-4">
                <button
                    onClick={() => setShowDebug(true)}
                    className="bg-gray-700 text-white px-3 py-1 rounded text-xs opacity-50 hover:opacity-100"
                >
                    🐛 Debug
                </button>
            </div>
        )
    }

    const testQRCodeUrl = () => {
        const currentHost = window.location.hostname
        const currentPort = window.location.port || '3000'
        const testUrl = `http://${currentHost}:${currentPort}?code=${testCode}`

        // Simulate QR code scan by navigating to URL with code
        window.location.href = testUrl
    }

    const testDirectPairing = () => {
        onTestPairing(testCode)
    }

    return (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-sm">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-medium">🐛 Debug Panel</h3>
                <button
                    onClick={() => setShowDebug(false)}
                    className="text-gray-400 hover:text-white"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-3 text-sm">
                <div>
                    <div className="text-gray-300">Connection Status:</div>
                    <div className={`font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {connectionState} {isConnected ? '🟢' : '🔴'}
                    </div>
                </div>

                <div>
                    <div className="text-gray-300">Current URL:</div>
                    <div className="font-mono text-xs text-gray-400 break-all">
                        {window.location.href}
                    </div>
                </div>

                <div>
                    <div className="text-gray-300">URL Params:</div>
                    <div className="font-mono text-xs text-gray-400">
                        {JSON.stringify(Object.fromEntries(new URLSearchParams(window.location.search).entries()))}
                    </div>
                </div>

                <div className="border-t border-gray-600 pt-3">
                    <div className="text-gray-300 mb-2">Test Pairing:</div>
                    <input
                        type="text"
                        value={testCode}
                        onChange={(e) => setTestCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs mb-2"
                        maxLength={6}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={testQRCodeUrl}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >
                            📱 Test QR URL
                        </button>
                        <button
                            onClick={testDirectPairing}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                        >
                            🔗 Test Direct
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DebugPanel