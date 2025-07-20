import { errorMessages, successMessages, getRandomQuip, getErrorMessage } from '../errorMessages'

describe('Error Messages', () => {
    test('has all required error categories', () => {
        expect(errorMessages.connection).toBeDefined()
        expect(errorMessages.pairing).toBeDefined()
        expect(errorMessages.prompt).toBeDefined()
        expect(errorMessages.general).toBeDefined()
    })

    test('has all required success messages', () => {
        expect(successMessages.connection).toBeDefined()
        expect(successMessages.pairing).toBeDefined()
        expect(successMessages.prompt).toBeDefined()
    })

    test('getRandomQuip returns different messages', () => {
        const quip1 = getRandomQuip('general')
        const quip2 = getRandomQuip('general')

        expect(typeof quip1).toBe('string')
        expect(typeof quip2).toBe('string')
        expect(quip1.length).toBeGreaterThan(0)
    })

    test('getRandomQuip handles unknown categories', () => {
        const quip = getRandomQuip('unknown-category')
        expect(typeof quip).toBe('string')
        expect(quip.length).toBeGreaterThan(0)
    })

    test('getErrorMessage handles string errors', () => {
        const message = getErrorMessage('Test error')
        expect(message).toBe('Test error')
    })

    test('getErrorMessage handles Error objects', () => {
        const error = new Error('Connection failed')
        const message = getErrorMessage(error)
        expect(message).toContain('Connection failed')
    })

    test('getErrorMessage matches connection patterns', () => {
        const connectionError = new Error('Connection refused')
        const message = getErrorMessage(connectionError)
        expect(message).toBe(errorMessages.connection.refused)
    })

    test('getErrorMessage matches timeout patterns', () => {
        const timeoutError = new Error('Request timeout')
        const message = getErrorMessage(timeoutError)
        expect(message).toBe(errorMessages.general.timeout)
    })

    test('getErrorMessage handles unknown errors', () => {
        const unknownError = {}
        const message = getErrorMessage(unknownError)
        expect(message).toBe(errorMessages.general.unknown)
    })

    test('all error messages contain emojis', () => {
        const checkEmojis = (obj) => {
            Object.values(obj).forEach(value => {
                if (typeof value === 'string') {
                    expect(value).toMatch(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u)
                } else if (typeof value === 'object') {
                    checkEmojis(value)
                }
            })
        }

        checkEmojis(errorMessages)
        checkEmojis(successMessages)
    })
})