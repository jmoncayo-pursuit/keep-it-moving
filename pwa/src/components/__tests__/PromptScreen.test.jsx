import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PromptScreen from '../screens/PromptScreen'

describe('PromptScreen', () => {
    const mockOnSendPrompt = jest.fn()

    beforeEach(() => {
        mockOnSendPrompt.mockClear()
    })

    test('renders prompt screen with all elements', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        expect(screen.getByText('Send Prompt')).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/Type your prompt here/)).toBeInTheDocument()
        expect(screen.getByText('🚀 Send to Copilot')).toBeInTheDocument()
        expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    test('shows disconnected state', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="disconnected"
                isConnected={false}
            />
        )

        expect(screen.getByText('Disconnected')).toBeInTheDocument()
        expect(screen.getByText('🔌 Not Connected')).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeDisabled()
    })

    test('validates prompt input', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const button = screen.getByRole('button')
        const textarea = screen.getByPlaceholderText(/Type your prompt here/)

        // Button disabled with empty input
        expect(button).toBeDisabled()

        // Button enabled with text
        fireEvent.change(textarea, { target: { value: 'Test prompt' } })
        expect(button).not.toBeDisabled()

        // Button disabled with only whitespace
        fireEvent.change(textarea, { target: { value: '   ' } })
        expect(button).toBeDisabled()
    })

    test('sends prompt on form submit', async () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const textarea = screen.getByPlaceholderText(/Type your prompt here/)
        const form = textarea.closest('form')

        fireEvent.change(textarea, { target: { value: 'Test prompt' } })
        fireEvent.submit(form)

        expect(mockOnSendPrompt).toHaveBeenCalledWith('Test prompt')
    })

    test('sends prompt with Cmd+Enter', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const textarea = screen.getByPlaceholderText(/Type your prompt here/)

        fireEvent.change(textarea, { target: { value: 'Test prompt' } })
        fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true })

        expect(mockOnSendPrompt).toHaveBeenCalledWith('Test prompt')
    })

    test('shows character count', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const textarea = screen.getByPlaceholderText(/Type your prompt here/)

        expect(screen.getByText('0/1000 characters')).toBeInTheDocument()

        fireEvent.change(textarea, { target: { value: 'Hello' } })
        expect(screen.getByText('5/1000 characters')).toBeInTheDocument()
    })

    test('quick prompts work correctly', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const textarea = screen.getByPlaceholderText(/Type your prompt here/)
        const quickPromptButton = screen.getByText('Explain this code')

        fireEvent.click(quickPromptButton)

        expect(textarea.value).toBe('Explain this code')
    })

    test('shows sending state', async () => {
        mockOnSendPrompt.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const textarea = screen.getByPlaceholderText(/Type your prompt here/)
        const form = textarea.closest('form')

        fireEvent.change(textarea, { target: { value: 'Test prompt' } })
        fireEvent.submit(form)

        expect(screen.getByText('📤 Sending...')).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeDisabled()

        await waitFor(() => {
            expect(screen.getByText('🚀 Send to Copilot')).toBeInTheDocument()
        })
    })

    test('clears input after successful send', async () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const textarea = screen.getByPlaceholderText(/Type your prompt here/)
        const form = textarea.closest('form')

        fireEvent.change(textarea, { target: { value: 'Test prompt' } })
        fireEvent.submit(form)

        await waitFor(() => {
            expect(textarea.value).toBe('')
        })
    })

    test('shows recent prompts after sending', async () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const textarea = screen.getByPlaceholderText(/Type your prompt here/)
        const form = textarea.closest('form')

        // Send first prompt
        fireEvent.change(textarea, { target: { value: 'First prompt' } })
        fireEvent.submit(form)

        await waitFor(() => {
            expect(screen.getByText('Recent Prompts:')).toBeInTheDocument()
            expect(screen.getByText('First prompt')).toBeInTheDocument()
        })

        // Click recent prompt to reuse
        fireEvent.click(screen.getByText('First prompt'))
        expect(textarea.value).toBe('First prompt')
    })
})