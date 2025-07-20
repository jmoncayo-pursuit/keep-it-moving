import { renderHook, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'

// Mock WebSocket
class MockWebSocket {
    constructor(url) {
        this.url = url
        this.readyState = WebSocket.CONNECTING
        this.onopen = null
        this.onclose = null
        this.onmessage = null
        this.onerror = null

        // Simulate connection opening
        setTimeout(() => {
            this.readyState = WebSocket.OPEN
            this.onopen?.()
        }, 10)
    }

    send(data) {
        this.lastSent = data
    }

    close() {
        this.readyState = WebSocket.CLOSED
        this.onclose?.({ code: 1000, reason: 'Normal closure' })
    }

    // Test helpers
    simulateMessage(data) {
        this.onmessage?.({ data: JSON.stringify(data) })
    }

    simulateError() {
        this.onerror?.(new Error('Connection error'))
    }
}

global.WebSocket = MockWebSocket
WebSocket.CONNECTING = 0
WebSocket.OPEN = 1
WebSocket.CLOSED = 3

// Mock timers
jest.useFakeTimers()

describe('useWebSocket', () => {
    let mockCallbacks

    beforeEach(() => {
        mockCallbacks = {
            onConnected: jest.fn(),
            onDisconnected: jest.fn(),
            onPaired: jest.fn(),
            onPromptDelivered: jest.fn(),
            onError: jest.fn()
        }
        jest.clearAllTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
        jest.useFakeTimers()
    })

    test('establishes connection successfully', async () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        expect(result.current.connectionState).toBe('disconnected')

        act(() => {
            result.current.connect()
        })

        expect(result.current.connectionState).toBe('connecting')

        // Wait for connection to open
        act(() => {
            jest.advanceTimersByTime(20)
        })

        expect(result.current.connectionState).toBe('connected')
        expect(mockCallbacks.onConnected).toHaveBeenCalled()
    })

    test('handles connection errors', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        // Simulate connection error
        act(() => {
            jest.advanceTimersByTime(20)
            // Get the WebSocket instance and simulate error
            const ws = global.lastWebSocketInstance
            ws?.simulateError()
        })

        expect(mockCallbacks.onError).toHaveBeenCalled()
    })

    test('auto-reconnects with exponential backoff', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        // Wait for connection
        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Simulate connection close
        act(() => {
            const ws = global.lastWebSocketInstance
            ws?.close()
        })

        expect(mockCallbacks.onDisconnected).toHaveBeenCalled()
        expect(result.current.connectionState).toBe('disconnected')

        // Should schedule reconnection
        expect(jest.getTimerCount()).toBeGreaterThan(0)
    })

    test('sends messages when connected', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        act(() => {
            jest.advanceTimersByTime(20)
        })

        const testMessage = { type: 'test', data: 'hello' }

        act(() => {
            result.current.sendMessage(testMessage)
        })

        // Should have sent the message
        const ws = global.lastWebSocketInstance
        expect(ws?.lastSent).toBe(JSON.stringify(testMessage))
    })

    test('queues messages when disconnected', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        const testMessage = { type: 'prompt', data: 'hello' }

        act(() => {
            result.current.sendMessage(testMessage)
        })

        expect(mockCallbacks.onError).toHaveBeenCalledWith(
            expect.stringContaining('Message queued')
        )
    })

    test('processes offline queue when reconnected', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        // Send message while disconnected
        const testMessage = { type: 'prompt', data: 'hello' }

        act(() => {
            result.current.sendMessage(testMessage)
        })

        // Now connect
        act(() => {
            result.current.connect()
        })

        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Should have processed the queued message
        const ws = global.lastWebSocketInstance
        expect(ws?.lastSent).toContain('hello')
    })

    test('handles server messages correctly', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Simulate server messages
        const ws = global.lastWebSocketInstance

        act(() => {
            ws?.simulateMessage({ type: 'paired', data: { token: 'test-token' } })
        })

        expect(mockCallbacks.onPaired).toHaveBeenCalledWith('test-token')

        act(() => {
            ws?.simulateMessage({ type: 'prompt_delivered', message: 'Success!' })
        })

        expect(mockCallbacks.onPromptDelivered).toHaveBeenCalledWith('Success!')

        act(() => {
            ws?.simulateMessage({ type: 'error', message: 'Test error' })
        })

        expect(mockCallbacks.onError).toHaveBeenCalledWith('Test error')
    })

    test('sends heartbeat pings', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Fast forward to trigger heartbeat
        act(() => {
            jest.advanceTimersByTime(30000) // 30 seconds
        })

        const ws = global.lastWebSocketInstance
        expect(ws?.lastSent).toContain('"type":"ping"')
    })

    test('handles heartbeat timeout', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        act(() => {
            jest.advanceTimersByTime(20)
        })

        // Fast forward past heartbeat timeout without pong
        act(() => {
            jest.advanceTimersByTime(90000) // 90 seconds (3x heartbeat interval)
        })

        // Should have closed connection due to timeout
        expect(result.current.connectionState).toBe('disconnected')
    })

    test('updates last pong time on pong message', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        act(() => {
            jest.advanceTimersByTime(20)
        })

        const ws = global.lastWebSocketInstance

        // Send pong message
        act(() => {
            ws?.simulateMessage({ type: 'pong', timestamp: Date.now() })
        })

        // Should not timeout after receiving pong
        act(() => {
            jest.advanceTimersByTime(60000) // 60 seconds
        })

        expect(result.current.connectionState).toBe('connected')
    })

    test('limits offline queue size', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        // Send many messages while disconnected
        for (let i = 0; i < 15; i++) {
            act(() => {
                result.current.sendMessage({ type: 'prompt', data: `message-${i}` })
            })
        }

        // Should have limited queue size (error called for each message)
        expect(mockCallbacks.onError).toHaveBeenCalledTimes(15)
    })

    test('stops reconnection after max attempts', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        // Mock WebSocket to always fail
        global.WebSocket = class extends MockWebSocket {
            constructor(url) {
                super(url)
                setTimeout(() => {
                    this.readyState = WebSocket.CLOSED
                    this.onclose?.({ code: 1006, reason: 'Connection failed' })
                }, 10)
            }
        }

        act(() => {
            result.current.connect()
        })

        // Fast forward through all reconnection attempts
        for (let i = 0; i < 12; i++) {
            act(() => {
                jest.advanceTimersByTime(35000) // Max delay + some buffer
            })
        }

        expect(mockCallbacks.onError).toHaveBeenCalledWith(
            expect.stringContaining('Connection failed after multiple attempts')
        )
    })

    test('cleans up on disconnect', () => {
        const { result } = renderHook(() => useWebSocket(mockCallbacks))

        act(() => {
            result.current.connect()
        })

        act(() => {
            jest.advanceTimersByTime(20)
        })

        act(() => {
            result.current.disconnect()
        })

        expect(result.current.connectionState).toBe('disconnected')

        // Should have cleared timers
        expect(jest.getTimerCount()).toBe(0)
    })
})

// Store reference to last created WebSocket for testing
const originalWebSocket = global.WebSocket
global.WebSocket = class extends originalWebSocket {
    constructor(...args) {
        super(...args)
        global.lastWebSocketInstance = this
    }
}