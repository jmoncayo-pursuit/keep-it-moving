import React, { useState } from 'react'
import QRCode from 'react-qr-code'
import QRScanner from '../components/QRScanner'

function PairingScreen({ deviceType, onPair, isConnecting }) {
    const [manualCode, setManualCode] = useState('')
    const [showQR, setShowQR] = useState(deviceType === 'phone')
    const [validationError, setValidationError] = useState('')
    const [isScanning, setIsScanning] = useState(false)

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

    // Handle QR code scan
    const handleQRScan = (data) => {
        console.log('QR code scanned:', data)

        try {
            // Check if it's a URL with code parameter
            if (data && typeof data === 'string' && data.includes('?code=')) {
                const url = new URL(data);
                const code = url.searchParams.get('code');

                if (code && code.length === 6) {
                    // Auto-fill the code if in manual mode
                    if (!showQR) {
                        setManualCode(code);
                    }

                    // Directly pair with the code
                    onPair(code);
                    return;
                }
            }

            // Try parsing as JSON (fallback for older QR codes)
            try {
                const jsonData = JSON.parse(data);
                if (jsonData && jsonData.type === 'kim-pairing' && jsonData.code) {
                    // Auto-fill the code if in manual mode
                    if (!showQR) {
                        setManualCode(jsonData.code);
                    }

                    // Directly pair with the code
                    onPair(jsonData.code);
                    return;
                }
            } catch (e) {
                // Not JSON, continue with other checks
            }

            setValidationError('Invalid QR code format. Please try again.');
        } catch (error) {
            setValidationError('Failed to process QR code: ' + error.message);
        }
    }

    const handleQRError = (error) => {
        setValidationError(error)
    }

    // Toggle QR scanner
    const toggleScanner = () => {
        setIsScanning(!isScanning)
    }

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
                    /* QR Code Scanning */
                    <div className="space-y-6">
                        {isScanning ? (
                            <QRScanner
                                onScan={handleQRScan}
                                onError={handleQRError}
                            />
                        ) : (
                            <div className="text-center">
                                <button
                                    onClick={toggleScanner}
                                    className="kim-button"
                                >
                                    <span className="emoji">📷</span> Scan QR Code
                                </button>

                                <div className="mt-4 space-y-2">
                                    <p className="text-gray-300 text-sm">
                                        <span className="emoji">📱</span>
                                        Scan the QR code shown in VS Code
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                        Or switch to manual entry above
                                    </p>
                                </div>
                            </div>
                        )}

                        {validationError && (
                            <p className="text-kim-red text-sm mt-2 animate-pulse">
                                {validationError}
                            </p>
                        )}
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