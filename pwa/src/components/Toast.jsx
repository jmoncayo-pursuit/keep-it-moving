import React, { useEffect } from 'react'

function Toast({ message, type = 'info', onClose, duration = 4000 }) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration)
        return () => clearTimeout(timer)
    }, [onClose, duration])

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-kim-green border-green-400 text-white'
            case 'error':
                return 'bg-kim-red border-red-400 text-white'
            case 'warning':
                return 'bg-kim-yellow border-yellow-400 text-black'
            case 'info':
                return 'bg-kim-blue border-blue-400 text-white'
            default:
                return 'bg-gray-600 border-gray-400 text-white'
        }
    }

    const getTypeIcon = () => {
        switch (type) {
            case 'success':
                return '✅'
            case 'error':
                return '🐛'
            case 'warning':
                return '⚠️'
            case 'info':
                return 'ℹ️'
            default:
                return '💬'
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className={`
        ${getTypeStyles()} 
        border-l-4 p-4 rounded-lg shadow-lg max-w-sm
        transform transition-all duration-300 ease-in-out
      `}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <span className="emoji text-lg mr-2">{getTypeIcon()}</span>
                        <p className="text-sm font-medium">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-3 text-lg opacity-70 hover:opacity-100 transition-opacity"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Toast