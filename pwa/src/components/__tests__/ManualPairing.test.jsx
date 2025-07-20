import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PairingScreen from '../screens/PairingScreen'

describe('Manual Pairing Functionality', () => {
    const mockOnPair = jest.fn()

    beforeEach(() => {
        mockOnPair.mockClear()
    })

    test('validates code length', async () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const input = screen.getByPlaceholderText('123456')
        const form = input.closest('form')

        // Try with short code
        fireEvent.change(input, { target: { value: '123' } })
        fireEvent.submit(form)

        await waitFor(() => {
            expect(screen.getByText('Code must be exactly 6 digits! 🔢')).toBeInTheDocument()
        })

        expect(mockOnPair).not.toHaveBeenCalled()
    })

    test('validates numeric input only', async () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const input = screen.getByPlaceholderText('123456')

        // Try entering letters - should be filtered out
        fireEvent.change(input, { target: { value: 'abc123def' } })
        expect(input.value).toBe('123')

        // Complete with numbers
        fireEvent.change(input, { target: { value: '123456' } })
        expect(input.value).toBe('123456')
    })

    test('clears validation error on input change', async () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const input = screen.getByPlaceholderText('123456')
        const form = input.closest('form')

        // Trigger validation error
        fireEvent.change(input, { target: { value: '123' } })
        fireEvent.submit(form)

        await waitFor(() => {
            expect(screen.getByText('Code must be exactly 6 digits! 🔢')).toBeInTheDocument()
        })

        // Start typing - error should clear
        fireEvent.change(input, { target: { value: '1234' } })
        expect(screen.queryByText('Code must be exactly 6 digits! 🔢')).not.toBeInTheDocument()
    })

    test('shows error styling when validation fails', async () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const input = screen.getByPlaceholderText('123456')
        const form = input.closest('form')

        fireEvent.change(input, { target: { value: '123' } })
        fireEvent.submit(form)

        await waitFor(() => {
            expect(input).toHaveClass('border-kim-red')
        })
    })

    test('successful pairing with valid code', () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const input = screen.getByPlaceholderText('123456')
        const form = input.closest('form')

        fireEvent.change(input, { target: { value: '123456' } })
        fireEvent.submit(form)

        expect(mockOnPair).toHaveBeenCalledWith('123456')
    })

    test('button states work correctly', () => {
        const { rerender } = render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const button = screen.getByRole('button')

        // Initially disabled
        expect(button).toBeDisabled()

        // Enabled with valid code
        const input = screen.getByPlaceholderText('123456')
        fireEvent.change(input, { target: { value: '123456' } })
        expect(button).not.toBeDisabled()

        // Disabled when connecting
        rerender(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={true}
            />
        )
        expect(button).toBeDisabled()
        expect(screen.getByText('⚡ Connecting...')).toBeInTheDocument()
    })
})