import React, { useState, useRef, useEffect } from 'react'

function PromptScreen({ onSendPrompt, connectionState, isConnected }) {
    const [prompt, setPrompt] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [lastSentPrompt, setLastSentPrompt] = useState('')
    const [promptHistory, setPromptHistory] = useState([])
    const textareaRef = useRef(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!prompt.trim() || isSending || !isConnected) return

        const trimmedPrompt = prompt.trim()
        setIsSending(true)
        setLastSentPrompt(trimmedPrompt)

        try {
            await onSendPrompt(trimmedPrompt)

            // Add to history
            setPromptHistory(prev => [
                { text: trimmedPrompt, timestamp: Date.now(), status: 'sent' },
                ...prev.slice(0, 4) // Keep last 5 prompts
            ])

            setPrompt('')
            textareaRef.current?.focus()
        } catch (error) {
            console.error('Failed to send prompt:', error)
        } finally {
            setIsSending(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e)
        }
    }

    const quickPrompts = [
        "Explain this code",
        "Add error handling",
        "Optimize performance",
        "Write unit tests",
        "Add documentation",
        "Refactor this function"
    ]

    const vibeCheckQuips = [
        "Your code's got swagger! 💫",
        "Ready to make some magic happen! ✨",
        "Time to level up this code! 🚀",
        "Let's cook up something awesome! 👨‍🍳",
        "Code vibes are immaculate today! 🎯",
        "Feeling that developer flow! 🌊",
        "You're in the coding zone! 🎯",
        "Ready to ship some fire code! 🔥",
        "The force is strong with this one! ⭐",
        "Coding like a rockstar! 🎸",
        "Time to make the impossible possible! 🚀",
        "Your keyboard is about to get a workout! ⌨️"
    ]

    const [vibeCheckEnabled, setVibeCheckEnabled] = useState(true)
    const [currentQuip, setCurrentQuip] = useState('')

    const getRandomQuip = () => {
        if (!vibeCheckEnabled) return ''
        const newQuip = vibeCheckQuips[Math.floor(Math.random() * vibeCheckQuips.length)]
        setCurrentQuip(newQuip)
        return newQuip
    }

    // Update quip every 10 seconds
    useEffect(() => {
        if (vibeCheckEnabled) {
            getRandomQuip()
            const interval = setInterval(getRandomQuip, 10000)
            return () => clearInterval(interval)
        }
    }, [vibeCheckEnabled])

    const handleQuickPrompt = (quickPrompt) => {
        setPrompt(quickPrompt)
        textareaRef.current?.focus()
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="kim-card">
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        <span className="emoji">💬</span> Send Prompt
                    </h2>
                    <p className="text-gray-300">
                        Your message will appear in VS Code Copilot chat
                    </p>
                    {vibeCheckEnabled && (
                        <p className="text-kim-blue text-sm mt-2 animate-pulse">
                            {currentQuip}
                        </p>
                    )}

                    {/* Connection Status */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs mt-2 ${isConnected
                        ? 'bg-kim-green bg-opacity-20 text-kim-green'
                        : 'bg-kim-red bg-opacity-20 text-kim-red'
                        }`}>
                        <span className="emoji mr-1">
                            {isConnected ? '🟢' : '🔴'}
                        </span>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            What would you like Copilot to help with?
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your prompt here... (Cmd/Ctrl + Enter to send)"
                            className="kim-input w-full h-32 resize-none"
                            maxLength={1000}
                        />
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-400">
                                {prompt.length}/1000 characters
                            </span>
                            <span className="text-xs text-gray-400">
                                <span className="emoji">⌨️</span> Cmd/Ctrl + Enter to send
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!prompt.trim() || isSending || !isConnected}
                        className={`kim-button w-full ${!prompt.trim() || isSending || !isConnected
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                    >
                        {!isConnected ? (
                            <>
                                <span className="emoji">🔌</span> Not Connected
                            </>
                        ) : isSending ? (
                            <>
                                <span className="emoji animate-pulse">📤</span> Sending...
                            </>
                        ) : (
                            <>
                                <span className="emoji">🚀</span> Send to Copilot
                            </>
                        )}
                    </button>
                </form>

                {/* Quick Prompts */}
                <div className="mt-8">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">
                        <span className="emoji">⚡</span> Quick Prompts:
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        {quickPrompts.map((quickPrompt, index) => (
                            <button
                                key={index}
                                onClick={() => handleQuickPrompt(quickPrompt)}
                                className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                            >
                                {quickPrompt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Prompts */}
                {promptHistory.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">
                            <span className="emoji">📝</span> Recent Prompts:
                        </h3>
                        <div className="space-y-2">
                            {promptHistory.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-2 bg-gray-700 rounded text-xs text-gray-300 cursor-pointer hover:bg-gray-600 transition-colors"
                                    onClick={() => {
                                        setPrompt(item.text)
                                        textareaRef.current?.focus()
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="truncate flex-1">{item.text}</span>
                                        <span className="emoji ml-2">✅</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Vibe Check Settings */}
                <div className="mt-8 p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-white">
                            <span className="emoji">✨</span> Vibe Check Mode
                        </h3>
                        <button
                            onClick={() => setVibeCheckEnabled(!vibeCheckEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vibeCheckEnabled ? 'bg-kim-blue' : 'bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${vibeCheckEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                    <p className="text-xs text-gray-300 mb-3">
                        {vibeCheckEnabled
                            ? 'Enjoying the motivational vibes! 🎉'
                            : 'Vibe check disabled - all business mode 💼'
                        }
                    </p>
                </div>

                {/* Tips */}
                <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-2">
                        <span className="emoji">💡</span> Pro Tips:
                    </h3>
                    <ul className="text-xs text-gray-300 space-y-1">
                        <li>• Be specific about what you want Copilot to do</li>
                        <li>• Include context about your code or project</li>
                        <li>• Ask for explanations, improvements, or alternatives</li>
                        <li>• Use Cmd/Ctrl + Enter for quick sending</li>
                        <li>• Click recent prompts to reuse them</li>
                        <li>• Toggle vibe check for motivational quips</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default PromptScreen