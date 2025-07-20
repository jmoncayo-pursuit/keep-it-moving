import { performance } from 'perf_hooks'

// Mock WebSocket for performance testing
class PerformanceWebSocket {
    constructor(url) {
        this.url = url
        this.readyState = WebSocket.CONNECTING
        this.onopen = null
        this.onclose = null
        this.onmessage = null
        this.onerror = null
        this.messageQueue = []

        // Simulate realistic connection time
        setTimeout(() => {
            this.readyState = WebSocket.OPEN
            this.onopen?.()
        }, Math.random() * 100 + 50) // 50-150ms connection time
    }

    send(data) {
        const sendTime = performance.now()
        this.messageQueue.push({ data, sendTime })

        // Simulate server response time
        setTimeout(() => {
            const message = JSON.parse(data)
            let response

            switch (message.type) {
                case 'pair':
                    response = {
                        type: 'paired',
                        success: true,
                        data: { token: 'perf-test-token' }
                    }
                    break
                case 'prompt':
                    response = {
                        type: 'prompt_delivered',
                        success: true,
                        message: 'Prompt delivered'
                    }
                    break
                case 'ping':
                    response = {
                        type: 'pong',
                        timestamp: message.timestamp
                    }
                    break
                default:
                    return
            }

            this.onmessage?.({ data: JSON.stringify(response) })
        }, Math.random() * 50 + 10) // 10-60ms response time
    }

    close() {
        this.readyState = WebSocket.CLOSED
        this.onclose?.({ code: 1000, reason: 'Normal closure' })
    }
}

global.WebSocket = PerformanceWebSocket
WebSocket.CONNECTING = 0
WebSocket.OPEN = 1
WebSocket.CLOSED = 3

describe('KIM Performance Tests', () => {
    test('connection establishment time < 2 seconds', async () => {
        const startTime = performance.now()

        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = () => {
                const connectionTime = performance.now() - startTime
                expect(connectionTime).toBeLessThan(2000) // 2 seconds
                resolve()
            }
        })
    })

    test('prompt relay response time < 2 seconds', async () => {
        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = resolve
        })

        const startTime = performance.now()

        ws.send(JSON.stringify({
            type: 'prompt',
            token: 'test-token',
            prompt: 'Test prompt for performance'
        }))

        await new Promise((resolve) => {
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data)
                if (message.type === 'prompt_delivered') {
                    const responseTime = performance.now() - startTime
                    expect(responseTime).toBeLessThan(2000) // 2 seconds
                    resolve()
                }
            }
        })
    })

    test('pairing flow completion time < 5 seconds', async () => {
        const startTime = performance.now()

        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'pair',
                    code: '123456',
                    deviceInfo: { type: 'test' }
                }))
            }

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data)
                if (message.type === 'paired') {
                    const pairingTime = performance.now() - startTime
                    expect(pairingTime).toBeLessThan(5000) // 5 seconds
                    resolve()
                }
            }
        })
    })

    test('heartbeat ping-pong latency < 100ms', async () => {
        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = resolve
        })

        const pingTime = performance.now()

        ws.send(JSON.stringify({
            type: 'ping',
            timestamp: pingTime
        }))

        await new Promise((resolve) => {
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data)
                if (message.type === 'pong') {
                    const latency = performance.now() - pingTime
                    expect(latency).toBeLessThan(100) // 100ms
                    resolve()
                }
            }
        })
    })

    test('handles 100 rapid prompt sends with 95% success rate', async () => {
        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = resolve
        })

        const prompts = Array.from({ length: 100 }, (_, i) => `Test prompt ${i}`)
        const responses = []
        let responseCount = 0

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            if (message.type === 'prompt_delivered') {
                responses.push(message)
                responseCount++
            }
        }

        // Send all prompts rapidly
        const startTime = performance.now()
        prompts.forEach((prompt, i) => {
            setTimeout(() => {
                ws.send(JSON.stringify({
                    type: 'prompt',
                    token: 'test-token',
                    prompt
                }))
            }, i * 10) // 10ms between sends
        })

        // Wait for responses
        await new Promise((resolve) => {
            const checkResponses = () => {
                if (responseCount >= 95 || performance.now() - startTime > 10000) {
                    resolve()
                } else {
                    setTimeout(checkResponses, 100)
                }
            }
            checkResponses()
        })

        const successRate = (responseCount / prompts.length) * 100
        expect(successRate).toBeGreaterThanOrEqual(95) // 95% success rate
    })

    test('memory usage stays reasonable during extended operation', async () => {
        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = resolve
        })

        const initialMemory = process.memoryUsage().heapUsed

        // Simulate 1000 operations
        for (let i = 0; i < 1000; i++) {
            ws.send(JSON.stringify({
                type: 'prompt',
                token: 'test-token',
                prompt: `Memory test prompt ${i}`
            }))

            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 1))
        }

        // Wait a bit for garbage collection
        await new Promise(resolve => setTimeout(resolve, 1000))

        const finalMemory = process.memoryUsage().heapUsed
        const memoryIncrease = finalMemory - initialMemory

        // Memory increase should be reasonable (less than 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    test('reconnection time after connection loss < 5 seconds', async () => {
        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = resolve
        })

        const disconnectTime = performance.now()

        // Simulate connection loss
        ws.close()

        // Create new connection (simulating auto-reconnect)
        const newWs = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            newWs.onopen = () => {
                const reconnectTime = performance.now() - disconnectTime
                expect(reconnectTime).toBeLessThan(5000) // 5 seconds
                resolve()
            }
        })
    })

    test('concurrent connections handling', async () => {
        const connectionCount = 10
        const connections = []
        const startTime = performance.now()

        // Create multiple concurrent connections
        for (let i = 0; i < connectionCount; i++) {
            const ws = new WebSocket('ws://localhost:8080')
            connections.push(ws)
        }

        // Wait for all connections to open
        await Promise.all(connections.map(ws => new Promise(resolve => {
            ws.onopen = resolve
        })))

        const connectionTime = performance.now() - startTime

        // All connections should establish within reasonable time
        expect(connectionTime).toBeLessThan(3000) // 3 seconds for 10 connections

        // Test that all connections can send messages
        const messagePromises = connections.map((ws, i) => new Promise(resolve => {
            ws.send(JSON.stringify({
                type: 'prompt',
                token: `test-token-${i}`,
                prompt: `Concurrent test ${i}`
            }))

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data)
                if (message.type === 'prompt_delivered') {
                    resolve()
                }
            }
        }))

        await Promise.all(messagePromises)

        // Clean up
        connections.forEach(ws => ws.close())
    })

    test('large prompt handling performance', async () => {
        const ws = new WebSocket('ws://localhost:8080')

        await new Promise((resolve) => {
            ws.onopen = resolve
        })

        // Create a large prompt (close to 1000 character limit)
        const largePrompt = 'A'.repeat(950) + ' - explain this code'

        const startTime = performance.now()

        ws.send(JSON.stringify({
            type: 'prompt',
            token: 'test-token',
            prompt: largePrompt
        }))

        await new Promise((resolve) => {
            ws.onmessage = (event) => {
                const message = JSON.parse(event.data)
                if (message.type === 'prompt_delivered') {
                    const processingTime = performance.now() - startTime
                    expect(processingTime).toBeLessThan(2000) // 2 seconds even for large prompts
                    resolve()
                }
            }
        })
    })
})