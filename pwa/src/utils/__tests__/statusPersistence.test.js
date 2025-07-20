import StatusPersistence from '../statusPersistence'

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}
global.localStorage = localStorageMock

describe('StatusPersistence', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.spyOn(Date, 'now').mockReturnValue(1000000)
    })

    afterEach(() => {
        Date.now.mockRestore()
    })

    describe('Connection State', () => {
        test('saves connection state with timestamp', () => {
            StatusPersistence.saveConnectionState('connected')

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'kim-connection-state',
                JSON.stringify({
                    state: 'connected',
                    timestamp: 1000000
                })
            )
        })

        test('loads recent connection state', () => {
            localStorage.getItem.mockReturnValue(JSON.stringify({
                state: 'connected',
                timestamp: 1000000 - 60000 // 1 minute ago
            }))

            const state = StatusPersistence.getConnectionState()
            expect(state).toBe('connected')
        })

        test('returns disconnected for stale state', () => {
            localStorage.getItem.mockReturnValue(JSON.stringify({
                state: 'connected',
                timestamp: 1000000 - 10 * 60 * 1000 // 10 minutes ago
            }))

            const state = StatusPersistence.getConnectionState()
            expect(state).toBe('disconnected')
        })

        test('handles missing connection state', () => {
            localStorage.getItem.mockReturnValue(null)

            const state = StatusPersistence.getConnectionState()
            expect(state).toBe('disconnected')
        })
    })

    describe('Error Handling', () => {
        test('saves error with context and timestamp', () => {
            const error = new Error('Test error')
            StatusPersistence.saveLastError(error, 'connection')

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'kim-last-error',
                JSON.stringify({
                    error: 'Error: Test error',
                    context: 'connection',
                    timestamp: 1000000
                })
            )
        })

        test('loads recent error', () => {
            localStorage.getItem.mockReturnValue(JSON.stringify({
                error: 'Test error',
                context: 'connection',
                timestamp: 1000000 - 60000 // 1 minute ago
            }))

            const error = StatusPersistence.getLastError()
            expect(error).toEqual({
                error: 'Test error',
                context: 'connection',
                timestamp: 1000000 - 60000
            })
        })

        test('ignores old errors', () => {
            localStorage.getItem.mockReturnValue(JSON.stringify({
                error: 'Old error',
                context: 'connection',
                timestamp: 1000000 - 15 * 60 * 1000 // 15 minutes ago
            }))

            const error = StatusPersistence.getLastError()
            expect(error).toBeNull()
        })

        test('clears last error', () => {
            StatusPersistence.clearLastError()
            expect(localStorage.removeItem).toHaveBeenCalledWith('kim-last-error')
        })
    })

    describe('Prompt History', () => {
        test('saves prompt history with limit', () => {
            const prompts = Array.from({ length: 15 }, (_, i) => `Prompt ${i}`)
            StatusPersistence.savePromptHistory(prompts)

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'kim-prompt-history',
                JSON.stringify({
                    prompts: prompts.slice(0, 10), // Should limit to 10
                    timestamp: 1000000
                })
            )
        })

        test('loads recent prompt history', () => {
            const prompts = ['Prompt 1', 'Prompt 2']
            localStorage.getItem.mockReturnValue(JSON.stringify({
                prompts,
                timestamp: 1000000 - 60000 // 1 minute ago
            }))

            const history = StatusPersistence.getPromptHistory()
            expect(history).toEqual(prompts)
        })

        test('returns empty array for old history', () => {
            localStorage.getItem.mockReturnValue(JSON.stringify({
                prompts: ['Old prompt'],
                timestamp: 1000000 - 25 * 60 * 60 * 1000 // 25 hours ago
            }))

            const history = StatusPersistence.getPromptHistory()
            expect(history).toEqual([])
        })
    })

    describe('Settings', () => {
        test('saves settings with timestamp', () => {
            const settings = { vibeCheckEnabled: false }
            StatusPersistence.saveSettings(settings)

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'kim-settings',
                JSON.stringify({
                    vibeCheckEnabled: false,
                    timestamp: 1000000
                })
            )
        })

        test('loads settings with defaults', () => {
            localStorage.getItem.mockReturnValue(JSON.stringify({
                vibeCheckEnabled: false,
                timestamp: 1000000
            }))

            const settings = StatusPersistence.getSettings()
            expect(settings).toEqual({
                vibeCheckEnabled: false,
                soundEnabled: false,
                autoReconnect: true,
                timestamp: 1000000
            })
        })

        test('returns defaults when no settings saved', () => {
            localStorage.getItem.mockReturnValue(null)

            const settings = StatusPersistence.getSettings()
            expect(settings).toEqual({
                vibeCheckEnabled: true,
                soundEnabled: false,
                autoReconnect: true
            })
        })
    })

    describe('Error Handling', () => {
        test('handles localStorage errors gracefully', () => {
            localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage full')
            })

            // Should not throw
            expect(() => {
                StatusPersistence.saveConnectionState('connected')
            }).not.toThrow()
        })

        test('handles JSON parse errors gracefully', () => {
            localStorage.getItem.mockReturnValue('invalid json')

            const state = StatusPersistence.getConnectionState()
            expect(state).toBe('disconnected')
        })
    })

    describe('Clear All', () => {
        test('clears all storage keys', () => {
            StatusPersistence.clearAll()

            expect(localStorage.removeItem).toHaveBeenCalledTimes(6)
            expect(localStorage.removeItem).toHaveBeenCalledWith('kim-connection-state')
            expect(localStorage.removeItem).toHaveBeenCalledWith('kim-last-error')
            expect(localStorage.removeItem).toHaveBeenCalledWith('kim-token')
            expect(localStorage.removeItem).toHaveBeenCalledWith('kim-device-info')
            expect(localStorage.removeItem).toHaveBeenCalledWith('kim-prompt-history')
            expect(localStorage.removeItem).toHaveBeenCalledWith('kim-settings')
        })
    })
})