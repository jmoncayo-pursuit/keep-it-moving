import { NotificationManager } from '../notifications'

// Mock Notification API
class MockNotification {
    constructor(title, options) {
        this.title = title
        this.options = options
        MockNotification.instances.push(this)
    }

    close() {
        this.closed = true
    }

    static instances = []
    static permission = 'default'
    static requestPermission = jest.fn().mockResolvedValue('granted')
}

global.Notification = MockNotification

describe('NotificationManager', () => {
    let manager

    beforeEach(() => {
        MockNotification.instances = []
        MockNotification.permission = 'default'
        MockNotification.requestPermission.mockClear()
        manager = new NotificationManager()
    })

    test('detects notification support', () => {
        expect(manager.isSupported).toBe(true)
    })

    test('requests permission on init', async () => {
        await manager.init()
        expect(MockNotification.requestPermission).toHaveBeenCalled()
    })

    test('can request permission manually', async () => {
        MockNotification.permission = 'default'
        const granted = await manager.requestPermission()

        expect(MockNotification.requestPermission).toHaveBeenCalled()
        expect(granted).toBe(true)
    })

    test('shows notification when permission granted', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.show('Test Title', { body: 'Test Body' })

        expect(notification).toBeInstanceOf(MockNotification)
        expect(notification.title).toBe('Test Title')
        expect(notification.options.body).toBe('Test Body')
    })

    test('does not show notification without permission', () => {
        MockNotification.permission = 'denied'
        manager.permission = 'denied'

        const notification = manager.show('Test Title')

        expect(notification).toBeNull()
    })

    test('auto-closes notifications after 5 seconds', (done) => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.show('Test Title')

        expect(notification.closed).toBeUndefined()

        setTimeout(() => {
            expect(notification.closed).toBe(true)
            done()
        }, 5100)
    }, 6000)

    test('does not auto-close when requireInteraction is true', (done) => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.show('Test Title', { requireInteraction: true })

        setTimeout(() => {
            expect(notification.closed).toBeUndefined()
            done()
        }, 5100)
    }, 6000)

    test('showConnectionSuccess creates correct notification', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.showConnectionSuccess()

        expect(notification.title).toBe('🚀 KIM Connected!')
        expect(notification.options.body).toBe('Ready to relay prompts to VS Code')
    })

    test('showConnectionLost creates correct notification', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.showConnectionLost()

        expect(notification.title).toBe('🔌 KIM Disconnected')
        expect(notification.options.body).toBe('Attempting to reconnect...')
    })

    test('showPairingSuccess creates correct notification', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.showPairingSuccess('phone')

        expect(notification.title).toBe('🎉 Device Paired!')
        expect(notification.options.body).toBe('Your phone is now connected to VS Code')
    })

    test('showPromptDelivered creates correct notification', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.showPromptDelivered('Test prompt message')

        expect(notification.title).toBe('📤 Prompt Delivered!')
        expect(notification.options.body).toBe('"Test prompt message" sent to Copilot')
    })

    test('showPromptDelivered truncates long prompts', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const longPrompt = 'This is a very long prompt that should be truncated because it exceeds the reasonable length for a notification'
        const notification = manager.showPromptDelivered(longPrompt)

        expect(notification.options.body).toBe('"This is a very long prompt that should be truncat..." sent to Copilot')
    })

    test('showError creates correct notification', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.showError('Test error message')

        expect(notification.title).toBe('🐛 KIM Error')
        expect(notification.options.body).toBe('Test error message')
        expect(notification.options.requireInteraction).toBe(true)
    })

    test('showReconnectionFailed creates correct notification', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        const notification = manager.showReconnectionFailed()

        expect(notification.title).toBe('❌ Connection Failed')
        expect(notification.options.body).toBe('Unable to reconnect to KIM server. Please refresh the page.')
        expect(notification.options.requireInteraction).toBe(true)
    })

    test('handles notification creation errors gracefully', () => {
        MockNotification.permission = 'granted'
        manager.permission = 'granted'

        // Mock Notification constructor to throw
        const originalNotification = global.Notification
        global.Notification = function () {
            throw new Error('Notification failed')
        }

        const notification = manager.show('Test Title')

        expect(notification).toBeNull()

        // Restore
        global.Notification = originalNotification
    })

    test('canShow returns correct values', () => {
        // Not supported
        manager.isSupported = false
        expect(manager.canShow()).toBe(false)

        // Supported but no permission
        manager.isSupported = true
        manager.permission = 'denied'
        expect(manager.canShow()).toBe(false)

        // Supported with permission
        manager.permission = 'granted'
        expect(manager.canShow()).toBe(true)
    })
})