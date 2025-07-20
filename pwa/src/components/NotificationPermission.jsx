import React, { useState, useEffect } from 'react'
import notifications from '../utils/notifications'

function NotificationPermission() {
    const [showRequest, setShowRequest] = useState(false)
    const [permission, setPermission] = useState('default')

    useEffect(() => {
        if (notifications.isSupported) {
            setPermission(notifications.permission)
            setShowRequest(notifications.permission === 'default')
        }
    }, [])

    const handleRequestPermission = async () => {
        const granted = await notifications.requestPermission()
        setPermission(notifications.permission)
        setShowRequest(false)

        if (granted) {
            notifications.show('🎉 Notifications Enabled!', {
                body: 'You\'ll now get updates about KIM status',
                icon: '/favicon.ico'
            })
        }
    }

    const handleDismiss = () => {
        setShowRequest(false)
        // Remember dismissal for this session
        sessionStorage.setItem('kim-notification-dismissed', 'true')
    }

    // Don't show if already dismissed this session
    useEffect(() => {
        const dismissed = sessionStorage.getItem('kim-notification-dismissed')
        if (dismissed) {
            setShowRequest(false)
        }
    }, [])

    if (!notifications.isSupported || !showRequest || permission !== 'default') {
        return null
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg">
                <div className="flex items-start space-x-3">
                    <span className="emoji text-2xl">🔔</span>
                    <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">
                            Enable Notifications?
                        </h3>
                        <p className="text-gray-300 text-sm mb-3">
                            Get notified when KIM connects, disconnects, or encounters errors.
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleRequestPermission}
                                className="kim-button text-sm py-2 px-3"
                            >
                                <span className="emoji">✅</span> Enable
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="text-gray-400 hover:text-white text-sm py-2 px-3 rounded transition-colors"
                            >
                                Not now
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-white text-lg"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    )
}

export default NotificationPermission