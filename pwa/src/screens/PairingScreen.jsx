import React, { useState } from 'react'
import QRCode from 'react-qr-code'

function PairingScreen({ deviceType, onPair, isConnecting }) {
    const [manualCode, setManualCode] = useState('')
    const [showQR, setShowQR] = useState(deviceType === 'phone')
    const [validationError, setValidationError] = useState('')

    const handleManualPair = (e) => {
        e.preventDefault()
        setValidationError('')

        if (manualCode.length !== 6) {
            setValidationError('Code must be exactly 6 digits! 🔢')
            return
        }

        if (!/^\d{6}$/.test(manualCode)) {
            setValidationError('Only numbers allowed! 🔢')
            return
        }

        onPair(manualCode)
    }

    // Generate QR data with pairing instructions
    const qrData = JSON.stringify({
        type: 'kim-pairing',
        url: window.location.origin,
        instructions: 'Open this URL and enter the pairing code from VS Code',
        timestamp: Date.now()
    })

    return (
        <div className="max-w-md mx-auto">
            <div className="kim-card text-center">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        <span className="emoji">🔗</span> Pair Device
                    </h2>
                    <p className="text-gray-300">
                        Connect your {deviceType} to VS Code
                    </p>
                </div>

                {/* Device Type Toggle */}
                <div className="flex justify-center mb-6">
                    <div className="bg-gray-700 rounded-lg p-1 flex">
                        <button
                            onClick={() => setShowQR(true)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${showQR
                                ? 'bg-kim-blue text-white'
                                : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            <span className="emoji">📱</span> QR Code
                        </button>
                        <button
                            onClick={() => setShowQR(false)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!showQR
                                ? 'bg-kim-blue text-white'
                                : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            <span className="emoji">🔢</span> Manual
                        </button>
                    </div>
                </div>

                {showQR ? (
                    /* QR Code Pairing */
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-lg inline-block relative transform hover:scale-105 transition-transform duration-300">
                            <QRCode
                                value={qrData}
                                size={200}
                                className="animate-pulse-slow"
                            />
                            <div className="absolute -top-2 -right-2 animate-bounce">
                                <span className="text-2xl">📱</span>
                            </div>
                            <div className="absolute -bottom-2 -left-2 animate-wiggle">
                                <span className="text-lg">👆</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-gray-300 text-sm">
                                <span className="emoji animate-bounce-slow">📱</span>
                                Scan with your phone camera
                            </p>
                            <p className="text-gray-400 text-xs">
                                Or switch to manual entry above
                            </p>
                            <p className="text-kim-blue text-xs animate-pulse">
                                <span className="emoji">✨</span> Point and scan for instant pairing magic!
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Manual Code Entry */
                    <form onSubmit={handleManualPair} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Enter 6-digit pairing code from VS Code:
                            </label>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => {
                                    const newValue = e.target.value.replace(/\D/g, '').slice(0, 6)
                                    setManualCode(newValue)
                                    setValidationError('')
                                }}
                                placeholder="123456"
                                className={`kim-input w-full text-center text-2xl tracking-widest ${validationError ? 'border-kim-red focus:ring-kim-red' : ''
                                    }`}
                                maxLength={6}
                                pattern="[0-9]{6}"
                                autoComplete="off"
                            />
                            {validationError && (
                                <p className="text-kim-red text-sm mt-2 animate-pulse">
                                    {validationError}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={manualCode.length !== 6 || isConnecting}
                            className={`kim-button w-full ${manualCode.length !== 6 || isConnecting
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                                }`}
                        >
                            {isConnecting ? (
                                <>
                                    <span className="emoji animate-spin">⚡</span> Connecting...
                                </>
                            ) : (
                                <>
                                    <span className="emoji">🚀</span> Pair Device
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Instructions */}
                <div className="mt-8 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-2">
                        <span className="emoji">💡</span> How to get pairing code:
                    </h3>
                    <ol className="text-xs text-gray-300 space-y-1 text-left">
                        <li>1. Open VS Code with KIM extension</li>
                        <li>2. Run command: "KIM: Show Pairing Code"</li>
                        <li>3. Enter the 6-digit code above</li>
                        <li>4. Start sending prompts! <span className="emoji">🎉</span></li>
                    </ol>
                </div>
            </div>
        </div>
    )
}

export default PairingScreen