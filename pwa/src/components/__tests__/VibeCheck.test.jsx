import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import PromptScreen from '../screens/PromptScreen'

// Mock timers
jest.useFakeTimers()

describe('Vibe Check Mode', () => {
    const mockOnSendPrompt = jest.fn()

    beforeEach(() => {
        mockOnSendPrompt.mockClear()
        jest.clearAllTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
        jest.useFakeTimers()
    })

    test('shows vibe check toggle', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        expect(screen.getByText('Vibe Check Mode')).toBeInTheDocument()
        expect(screen.getByText('Enjoying the motivational vibes! 🎉')).toBeInTheDocument()
    })

    test('displays random quips when enabled', async () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        // Should show a quip initially
        await waitFor(() => {
            const quipElements = screen.getAllByText(/💫|✨|🚀|👨‍🍳|🎯|🌊|⭐|🔥|🎸|⌨️/)
            expect(quipElements.length).toBeGreaterThan(0)
        })
    })

    test('updates quips every 10 seconds', async () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        // Get initial quip
        await waitFor(() => {
            expect(screen.getByText(/💫|✨|🚀|👨‍🍳|🎯/)).toBeInTheDocument()
        })

        // Fast forward 10 seconds
        act(() => {
            jest.advanceTimersByTime(10000)
        })

        // Should still have a quip (might be the same or different)
        expect(screen.getByText(/💫|✨|🚀|👨‍🍳|🎯|🌊|⭐|🔥|🎸|⌨️/)).toBeInTheDocument()
    })

    test('can toggle vibe check mode off', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const toggle = screen.getByRole('button')

        // Toggle off
        fireEvent.click(toggle)

        expect(screen.getByText('Vibe check disabled - all business mode 💼')).toBeInTheDocument()

        // Should not show quips when disabled
        const quipElements = screen.queryAllByText(/💫|✨|🚀|👨‍🍳|🎯/)
        expect(quipElements).toHaveLength(0)
    })

    test('can toggle vibe check mode back on', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const toggle = screen.getByRole('button')

        // Toggle off then on
        fireEvent.click(toggle)
        fireEvent.click(toggle)

        expect(screen.getByText('Enjoying the motivational vibes! 🎉')).toBeInTheDocument()
    })

    test('toggle has correct visual states', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const toggle = screen.getByRole('button')

        // Initially enabled (blue background)
        expect(toggle).toHaveClass('bg-kim-blue')

        // Toggle off (gray background)
        fireEvent.click(toggle)
        expect(toggle).toHaveClass('bg-gray-600')

        // Toggle back on
        fireEvent.click(toggle)
        expect(toggle).toHaveClass('bg-kim-blue')
    })

    test('clears interval when component unmounts', () => {
        const { unmount } = render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        // Verify interval is set
        expect(jest.getTimerCount()).toBeGreaterThan(0)

        // Unmount component
        unmount()

        // Interval should be cleared
        expect(jest.getTimerCount()).toBe(0)
    })

    test('stops updating quips when disabled', async () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        const toggle = screen.getByRole('button')

        // Disable vibe check
        fireEvent.click(toggle)

        // Fast forward time
        act(() => {
            jest.advanceTimersByTime(10000)
        })

        // Should not show any quips
        const quipElements = screen.queryAllByText(/💫|✨|🚀|👨‍🍳|🎯|🌊|⭐|🔥|🎸|⌨️/)
        expect(quipElements).toHaveLength(0)
    })

    test('includes vibe check in pro tips', () => {
        render(
            <PromptScreen
                onSendPrompt={mockOnSendPrompt}
                connectionState="connected"
                isConnected={true}
            />
        )

        expect(screen.getByText('• Toggle vibe check for motivational quips')).toBeInTheDocument()
    })
})