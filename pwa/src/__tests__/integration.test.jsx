import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import App from '../App'

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url
        this.readyState = WebSocket.CONNECTING
        this.onopen = null
        this.onclose = null
        this.onmessage = null
        this.onerror = null

        MockWebSocket.instances.push(this)

        // Simulate connection opening
        setTimeout(() => {
            this.readyState = WebSocket.OPEN
            this.onopen?.()
        }, 10)
    }

    send(data) {
        this.lastSent = JSON.parse(data)
        MockWebSocket.lastMessage = this.lastSent
    }

    close() {
        this.readyState = WebSocket.CLOSED
        this.onclose?.({ code: 1000, reason: 'Normal closure' })
    }

    simulateMessage(data) {
        this.onmessage?.({ data: JSON.stringify(data) })
    }

    static instances = []
    static lastMessage = null
    static reset() {
        this.instances = []
        this.lastMessage = null
    }
}

global.WebSocket = MockWebSocket
WebSocket.CONNECTING = 0
WebSocket.OPEN = 1
WebSocket.CLOSED = 3

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock Notification
global.Notification = {
    permission: 'granted',
    requestPermission: jest.fn().mockResolvedValue('granted')
}

// Mock react-qr-code
jest.mock('react-qr-code', () => {
    return function MockQRCode({ value, size, className }) {
        return (
            <div
                data-testid="qr-code"
                data-value={value}
                data-size={size}
                className={className}
            >
                QR Code Mock
            </div>
        )
    }
})

// Use fake timers
jest.useFakeTimers()

describe('KIM Integration Tests', () => {
    beforeEach(() => {
        MockWebSocket.reset()
        localStorageMock.getItem.mockReturnValue(null)
        jest.clearAllMocks()
        jest.clearAllTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
        jest.useFakeTimers()
    })

    const renderApp = () => {
        return render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        )
    }

    test('complete pairing flow - QR code method', async () => {
        renderApp()

        // Should start on pairing screen
        expect(screen.getByText('Pair Device')).toBeInTheDocument()
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()

        // Switch to manual entry
        fireEvent.click(screen.getByText('🔢 Manual'))

        // Enter pairing code
        const input = screen.getByPlaceholderText('123456')
        fireEvent.change(input, { target: { value: '123456' } })

        // Submit pairing
        const form = input.closest('form')
        fireEvent.submit(form)

        // Wait for WebSocket connection
        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Should have sent pairing message
        expect(MockWebSocket.lastMessage).toEqual({
            type: 'pair',
            code: '123456',
            deviceInfo: expect.any(Object)
        })

        // Simulate successful pairing response
        const ws = MockWebSocket.instances[0]
        act(() => {
            ws.simulateMessage({
                type: 'paired',
                success: true,
                data: { token: 'test-token-123' }
            })
        })

        // Should redirect to prompt screen
        await waitFor(() => {
            expect(screen.getByText('Send Prompt')).toBeInTheDocument()
        })

        // Should show connected status
        expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    test('complete prompt sending flow', async () => {
        // Start with saved token to skip pairing
        localStorageMock.getItem.mockReturnValue('saved-token-123')

        renderApp()

        // Wait for connection
        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Simulate pairing restoration
        const ws = MockWebSocket.instances[0]
        act(() => {
            ws.simulateMessage({
                type: 'paired',
                success: true,
                data: { token: 'saved-token-123' }
            })
        })

        await waitFor(() => {
            expect(screen.getByText('Send Prompt')).toBeInTheDocument()
        })

        // Enter a prompt
        const textarea = screen.getByPlaceholderText(/Type your prompt here/)
        fireEvent.change(textarea, { target: { value: 'Explain this function' } })

        // Send prompt
        const sendButton = screen.getByText('🚀 Send to Copilot')
        fireEvent.click(sendButton)

        // Should have sent prompt message
        expect(MockWebSocket.lastMessage).toEqual({
            type: 'prompt',
            token: 'saved-token-123',
            prompt: 'Explain this function'
        })

        // Simulate prompt delivery confirmation
        act(() => {
            ws.simulateMessage({
                type: 'prompt_delivered',
                success: true,
                message: 'Prompt delivered successfully!'
            })
        })

        // Should show success toast
        await waitFor(() => {
            expect(screen.getByText(/delivered/i)).toBeInTheDocument()
        })

        // Should clear the input
        expect(textarea.value).toBe('')

        // Should add to recent prompts
        await waitFor(() => {
            expect(screen.getByText('Recent Prompts:')).toBeInTheDocument()
            expect(screen.getByText('Explain this function')).toBeInTheDocument()
        })
    })

    test('handles connection loss and recovery', async () => {
        localStorageMock.getItem.mockReturnValue('saved-token-123')

        renderApp()

        // Wait for connection
        act(() => {
            jest.advanceTimersByTime(20)
        })

        const ws = MockWebSocket.instances[0]

        // Simulate connection loss
        act(() => {
            ws.close()
        })

        // Should show disconnected status
        await waitFor(() => {
            expect(screen.getByText('Disconnected')).toBeInTheDocument()
        })

        // Should attempt reconnection
        act(() => {
            jest.advanceTimersByTime(2000) // Wait for reconnection delay
        })

        // Should have created new WebSocket instance
        expect(MockWebSocket.instances.length).toBeGreaterThan(1)

        // Simulate successful reconnection
        const newWs = MockWebSocket.instances[MockWebSocket.instances.length - 1]
        act(() => {
            newWs.readyState = WebSocket.OPEN
            newWs.onopen?.()
        })

        // Should show connected status again
        await waitFor(() => {
            expect(screen.getByText('Connected')).toBeInTheDocument()
        })
    })

    test('error handling throughout the flow', async () => {
        renderApp()

        // Test pairing error
        const input = screen.getByPlaceholderText('123456')
        fireEvent.change(input, { target: { value: '123456' } })

        const form = input.closest('form')
        fireEvent.submit(form)

        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Simulate pairing error
        const ws = MockWebSocket.instances[0]
        act(() => {
            ws.simulateMessage({
                type: 'error',
                success: false,
                message: 'Invalid pairing code'
            })
        })

        // Should show error toast
        await waitFor(() => {
            expect(screen.getByText(/Invalid pairing code/)).toBeInTheDocument()
        })

        // Should still be on pairing screen
        expect(screen.getByText('Pair Device')).toBeInTheDocument()
    })

    test('vibe check mode toggle works end-to-end', async () => {
        localStorageMock.getItem.mockReturnValue('saved-token-123')

        renderApp()

        // Wait for connection and pairing
        act(() => {
            jest.advanceTimersByTime(20)
        })

        const ws = MockWebSocket.instances[0]
        act(() => {
            ws.simulateMessage({
                type: 'paired',
                success: true,
                data: { token: 'saved-token-123' }
            })
        })

        await waitFor(() => {
            expect(screen.getByText('Send Prompt')).toBeInTheDocument()
        })

        // Should show vibe check quip initially
        expect(screen.getByText(/💫|✨|🚀|👨‍🍳|🎯/)).toBeInTheDocument()

        // Find and toggle vibe check off
        const toggle = screen.getByRole('button')
        fireEvent.click(toggle)

        // Should show disabled message
        expect(screen.getByText('Vibe check disabled - all business mode 💼')).toBeInTheDocument()

        // Should not show quips
        expect(screen.queryByText(/💫|✨|🚀|👨‍🍳|🎯/)).not.toBeInTheDocument()

        // Toggle back on
        fireEvent.click(toggle)

        // Should show enabled message
        expect(screen.getByText('Enjoying the motivational vibes! 🎉')).toBeInTheDocument()
    })

    test('navigation between screens works correctly', async () => {
        localStorageMock.getItem.mockReturnValue('saved-token-123')

        renderApp()

        // Wait for connection and pairing
        act(() => {
            jest.advanceTimersByTime(20)
        })

        const ws = MockWebSocket.instances[0]
        act(() => {
            ws.simulateMessage({
                type: 'paired',
                success: true,
                data: { token: 'saved-token-123' }
            })
        })

        await waitFor(() => {
            expect(screen.getByText('Send Prompt')).toBeInTheDocument()
        })

        // Navigate to status screen
        fireEvent.click(screen.getByText('Status'))

        await waitFor(() => {
            expect(screen.getByText(/Status/)).toBeInTheDocument()
        })

        // Navigate back to prompt screen
        fireEvent.click(screen.getByText('Prompt'))

        await waitFor(() => {
            expect(screen.getByText('Send Prompt')).toBeInTheDocument()
        })

        // Navigate to pairing screen
        fireEvent.click(screen.getByText('Pair'))

        await waitFor(() => {
            expect(screen.getByText('Pair Device')).toBeInTheDocument()
        })
    })

    test('offline queue functionality', async () => {
        localStorageMock.getItem.mockReturnValue('saved-token-123')

        renderApp()

        // Wait for connection and pairing
        act(() => {
            jest.advanceTimersByTime(20)
        })

        const ws = MockWebSocket.instances[0]
        act(() => {
            ws.simulateMessage({
                type: 'paired',
                success: true,
                data: { token: 'saved-token-123' }
            })
        })

        await waitFor(() => {
            expect(screen.getByText('Send Prompt')).toBeInTheDocument()
        })

        // Disconnect
        act(() => {
            ws.close()
        })

        await waitFor(() => {
            expect(screen.getByText('Disconnected')).toBeInTheDocument()
        })

        // Try to send prompt while disconnected
        const textarea = screen.getByPlaceholderText(/Type your prompt here/)
        fireEvent.change(textarea, { target: { value: 'Offline prompt' } })

        const sendButton = screen.getByText('🔌 Not Connected')
        expect(sendButton).toBeDisabled()

        // Reconnect
        act(() => {
            jest.advanceTimersByTime(2000)
        })

        const newWs = MockWebSocket.instances[MockWebSocket.instances.length - 1]
        act(() => {
            newWs.readyState = WebSocket.OPEN
            newWs.onopen?.()
        })

        await waitFor(() => {
            expect(screen.getByText('Connected')).toBeInTheDocument()
        })

        // Should be able to send prompts again
        expect(screen.getByText('🚀 Send to Copilot')).not.toBeDisabled()
    })
})