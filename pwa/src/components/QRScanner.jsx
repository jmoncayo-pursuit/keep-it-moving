import React, { useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function QRScanner({ onScan, onError }) {
    const [isScanning, setIsScanning] = useState(false)
    const [permissionGranted, setPermissionGranted] = useState(false)
    const [scannerInitialized, setScannerInitialized] = useState(false)
    const [html5QrCode, setHtml5QrCode] = useState(null)

    useEffect(() => {
        // Initialize scanner
        const qrCodeScanner = new Html5Qrcode('qr-reader')
        setHtml5QrCode(qrCodeScanner)
        setScannerInitialized(true)

        // Cleanup on unmount
        return () => {
            if (qrCodeScanner && isScanning) {
                qrCodeScanner.stop().catch(error => console.error('Failed to stop scanner:', error))
            }
        }
    }, [])

    const startScanner = async () => {
        if (!html5QrCode) return

        setIsScanning(true)
        try {
            await html5QrCode.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    // Success callback
                    try {
                        const data = JSON.parse(decodedText)
                        onScan(data)

                        // Stop scanning after successful scan
                        html5QrCode.stop().catch(error => console.error('Failed to stop scanner:', error))
                        setIsScanning(false)
                    } catch (error) {
                        onError('Invalid QR code format. Please try again.')
                    }
                },
                (errorMessage) => {
                    // Error callback - we don't need to show these to the user
                    console.log('QR scan error:', errorMessage)
                }
            )
            setPermissionGranted(true)
        } catch (error) {
            setIsScanning(false)
            if (error.toString().includes('permission')) {
                setPermissionGranted(false)
                onError('Camera permission denied. Please allow camera access.')
            } else {
                onError('Failed to start scanner: ' + error.message)
            }
        }
    }

    const stopScanner = async () => {
        if (html5QrCode && isScanning) {
            try {
                await html5QrCode.stop()
                setIsScanning(false)
            } catch (error) {
                console.error('Failed to stop scanner:', error)
            }
        }
    }

    return (
        <div className="qr-scanner-container">
            <div id="qr-reader" style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}></div>

            <div className="mt-4 flex justify-center space-x-2">
                {!isScanning && scannerInitialized && (
                    <button
                        onClick={startScanner}
                        className="kim-button-secondary"
                    >
                        <span className="emoji">📷</span> Start Camera
                    </button>
                )}

                {isScanning && (
                    <button
                        onClick={stopScanner}
                        className="kim-button-secondary"
                    >
                        <span className="emoji">⏹️</span> Stop Camera
                    </button>
                )}
            </div>

            {!permissionGranted && isScanning && (
                <div className="mt-4 text-kim-red text-sm">
                    <p>Please allow camera access when prompted</p>
                </div>
            )}

            <div className="mt-4 text-gray-300 text-sm">
                <p>Point your camera at the QR code shown in VS Code</p>
            </div>
        </div>
    )
}

export default QRScanner