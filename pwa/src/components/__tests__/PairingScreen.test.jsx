import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PairingScreen from '../screens/PairingScreen'

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

describe('PairingScreen', () => {
    const mockOnPair = jest.fn()

    beforeEach(() => {
        mockOnPair.mockClear()
    })

    test('renders pairing screen with QR code by default for phone', () => {
        render(
            <PairingScreen
                deviceType="phone"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        expect(screen.getByText('Pair Device')).toBeInTheDocument()
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()
        expect(screen.getByText('📱 QR Code')).toHaveClass('bg-kim-blue')
    })

    test('renders manual entry by default for laptop', () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        expect(screen.getByText('🔢 Manual')).toHaveClass('bg-kim-blue')
        expect(screen.getByPlaceholderText('123456')).toBeInTheDocument()
    })

    test('switches between QR and manual modes', () => {
        render(
            <PairingScreen
                deviceType="phone"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        // Start with QR mode
        expect(screen.getByTestId('qr-code')).toBeInTheDocument()

        // Switch to manual
        fireEvent.click(screen.getByText('🔢 Manual'))
        expect(screen.getByPlaceholderText('123456')).toBeInTheDocument()
        expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
    })

    test('validates manual pairing code input', () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const input = screen.getByPlaceholderText('123456')
        const button = screen.getByText('🚀 Pair Device')

        // Button should be disabled initially
        expect(button).toBeDisabled()

        // Enter invalid code (letters)
        fireEvent.change(input, { target: { value: 'abc123' } })
        expect(input.value).toBe('123') // Should filter out letters

        // Enter valid 6-digit code
        fireEvent.change(input, { target: { value: '123456' } })
        expect(input.value).toBe('123456')
        expect(button).not.toBeDisabled()
    })

    test('calls onPair with correct code', () => {
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

    test('shows connecting state', () => {
        render(
            <PairingScreen
                deviceType="laptop"
                onPair={mockOnPair}
                isConnecting={true}
            />
        )

        expect(screen.getByText('⚡ Connecting...')).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeDisabled()
    })

    test('QR code contains correct data structure', () => {
        render(
            <PairingScreen
                deviceType="phone"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        const qrCode = screen.getByTestId('qr-code')
        const qrValue = qrCode.getAttribute('data-value')
        const qrData = JSON.parse(qrValue)

        expect(qrData.type).toBe('kim-pairing')
        expect(qrData.url).toBeDefined()
        expect(qrData.instructions).toBeDefined()
        expect(qrData.timestamp).toBeDefined()
    })

    test('displays animated elements', () => {
        render(
            <PairingScreen
                deviceType="phone"
                onPair={mockOnPair}
                isConnecting={false}
            />
        )

        // Check for animated emojis
        expect(screen.getByText('📱')).toHaveClass('animate-bounce')
        expect(screen.getByText('👆')).toHaveClass('animate-wiggle')
        expect(screen.getByTestId('qr-code')).toHaveClass('animate-pulse-slow')
    })
})