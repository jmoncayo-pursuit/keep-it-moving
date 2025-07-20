// System notifications for KIM
export class NotificationManager {
    constructor() {
        this.permission = 'default'
        this.isSupported = 'Notification' in window
        this.init()
    }

    async init() {
        if (!this.isSupported) {
            console.log('🔕 Notifications not supported')
            return
        }

        this.permission = Notification.permission

        if (this.permission === 'default') {
            try {
                this.permission = await Notification.requestPermission()
            } catch (error) {
                console.warn('Failed to request notification permission:', error)
            }
        }
    }

    async requestPermission() {
        if (!this.isSupported) return false

        try {
            this.permission = await Notification.requestPermission()
            return this.permission === 'granted'
        } catch (error) {
            console.warn('Failed to request notification permission:', error)
            return false
        }
    }

    show(title, options = {}) {
        if (!this.canShow()) {
            console.log('Cannot show notification:', { permission: this.permission, supported: this.isSupported })
            return null
        }

        const defaultOptions = {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'kim-notification',
            requireInteraction: false,
            ...options
        }

        try {
            const notification = new Notification(title, defaultOptions)

            // Auto-close after 5 seconds unless requireInteraction is true
            if (!defaultOptions.requireInteraction) {
                setTimeout(() => {
                    notification.close()
                }, 5000)
            }

            return notification
        } catch (error) {
            console.warn('Failed to show notification:', error)
            return null
        }
    }

    canShow() {
        return this.isSupported && this.permission === 'granted'
    }

    // Predefined notification types for KIM
    showConnectionSuccess() {
        return this.show('🚀 KIM Connected!', {
            body: 'Ready to relay prompts to VS Code',
            icon: '/favicon.ico'
        })
    }

    showConnectionLost() {
        return this.show('🔌 KIM Disconnected', {
            body: 'Attempting to reconnect...',
            icon: '/favicon.ico'
        })
    }

    showPairingSuccess(deviceType) {
        return this.show('🎉 Device Paired!', {
            body: `Your ${deviceType} is now connected to VS Code`,
            icon: '/favicon.ico'
        })
    }

    showPromptDelivered(prompt) {
        const truncatedPrompt = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt
        return this.show('📤 Prompt Delivered!', {
            body: `"${truncatedPrompt}" sent to Copilot`,
            icon: '/favicon.ico'
        })
    }

    showError(error) {
        return this.show('🐛 KIM Error', {
            body: error,
            icon: '/favicon.ico',
            requireInteraction: true
        })
    }

    showReconnectionFailed() {
        return this.show('❌ Connection Failed', {
            body: 'Unable to reconnect to KIM server. Please refresh the page.',
            icon: '/favicon.ico',
            requireInteraction: true
        })
    }
}

// Singleton instance
export const notifications = new NotificationManager()

export default notifications