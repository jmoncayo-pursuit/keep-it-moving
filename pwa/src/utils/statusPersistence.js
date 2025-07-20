// Status persistence for KIM
const STORAGE_KEYS = {
    CONNECTION_STATE: 'kim-connection-state',
    LAST_ERROR: 'kim-last-error',
    PAIRING_TOKEN: 'kim-token',
    DEVICE_INFO: 'kim-device-info',
    PROMPT_HISTORY: 'kim-prompt-history',
    SETTINGS: 'kim-settings'
}

export class StatusPersistence {
    static saveConnectionState(state) {
        try {
            localStorage.setItem(STORAGE_KEYS.CONNECTION_STATE, JSON.stringify({
                state,
                timestamp: Date.now()
            }))
        } catch (error) {
            console.warn('Failed to save connection state:', error)
        }
    }

    static getConnectionState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.CONNECTION_STATE)
            if (saved) {
                const { state, timestamp } = JSON.parse(saved)
                // Consider state stale after 5 minutes
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    return state
                }
            }
        } catch (error) {
            console.warn('Failed to load connection state:', error)
        }
        return 'disconnected'
    }

    static saveLastError(error, context = 'general') {
        try {
            localStorage.setItem(STORAGE_KEYS.LAST_ERROR, JSON.stringify({
                error: error.toString(),
                context,
                timestamp: Date.now()
            }))
        } catch (error) {
            console.warn('Failed to save error:', error)
        }
    }

    static getLastError() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.LAST_ERROR)
            if (saved) {
                const errorData = JSON.parse(saved)
                // Only return recent errors (last 10 minutes)
                if (Date.now() - errorData.timestamp < 10 * 60 * 1000) {
                    return errorData
                }
            }
        } catch (error) {
            console.warn('Failed to load last error:', error)
        }
        return null
    }

    static clearLastError() {
        try {
            localStorage.removeItem(STORAGE_KEYS.LAST_ERROR)
        } catch (error) {
            console.warn('Failed to clear last error:', error)
        }
    }

    static savePromptHistory(prompts) {
        try {
            localStorage.setItem(STORAGE_KEYS.PROMPT_HISTORY, JSON.stringify({
                prompts: prompts.slice(0, 10), // Keep last 10
                timestamp: Date.now()
            }))
        } catch (error) {
            console.warn('Failed to save prompt history:', error)
        }
    }

    static getPromptHistory() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.PROMPT_HISTORY)
            if (saved) {
                const { prompts, timestamp } = JSON.parse(saved)
                // Keep history for 24 hours
                if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                    return prompts || []
                }
            }
        } catch (error) {
            console.warn('Failed to load prompt history:', error)
        }
        return []
    }

    static saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
                ...settings,
                timestamp: Date.now()
            }))
        } catch (error) {
            console.warn('Failed to save settings:', error)
        }
    }

    static getSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS)
            if (saved) {
                const settings = JSON.parse(saved)
                return {
                    vibeCheckEnabled: true,
                    soundEnabled: false,
                    autoReconnect: true,
                    ...settings
                }
            }
        } catch (error) {
            console.warn('Failed to load settings:', error)
        }

        return {
            vibeCheckEnabled: true,
            soundEnabled: false,
            autoReconnect: true
        }
    }

    static clearAll() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key)
            })
        } catch (error) {
            console.warn('Failed to clear storage:', error)
        }
    }
}

export default StatusPersistence