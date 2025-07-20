// Playful error messages for KIM
export const errorMessages = {
    connection: {
        failed: "Oops! The connection took a coffee break ☕",
        timeout: "Connection's running fashionably late ⏰",
        refused: "Server's playing hard to get 🙈",
        lost: "Connection went on an adventure without us 🗺️"
    },

    pairing: {
        invalidCode: "That code's not quite right! Try again 🔍",
        expiredCode: "Code expired faster than milk in the sun ⏰",
        alreadyUsed: "Someone beat you to it! Get a fresh code 🔄",
        serverError: "Server's having a moment. Give it a sec 🤖"
    },

    prompt: {
        empty: "Your prompt needs some love! Add some text 💝",
        tooLong: "Whoa there, Shakespeare! Keep it under 1000 chars 📝",
        sendFailed: "Prompt got lost in the digital void 🌌",
        notConnected: "We're not connected! Pair up first 🔌"
    },

    general: {
        unknown: "Something mysterious happened 🔮",
        networkError: "Network's taking a nap 😴",
        serverDown: "Server's out for lunch 🍕",
        timeout: "That took longer than expected ⏳"
    }
}

export const successMessages = {
    connection: {
        established: "Connected and ready to rock! 🚀",
        reconnected: "Back in business! 💪"
    },

    pairing: {
        success: "Device paired successfully! Welcome aboard 🎉",
        codeGenerated: "Fresh pairing code ready to go! 🔢"
    },

    prompt: {
        sent: "Prompt delivered with style! ✨",
        received: "Message received loud and clear! 📨"
    }
}

export const getRandomQuip = (category = 'general') => {
    const quips = {
        general: [
            "Keep calm and code on! 💻",
            "You've got this! 💪",
            "Coding magic in progress ✨",
            "Stay awesome! 🌟"
        ],

        waiting: [
            "Patience, young coder 🧘‍♂️",
            "Good things come to those who wait ⏳",
            "Loading awesomeness... 🔄",
            "Almost there! 🎯"
        ],

        success: [
            "Nailed it! 🎯",
            "You're on fire! 🔥",
            "Smooth as butter! 🧈",
            "Like a boss! 😎"
        ]
    }

    const categoryQuips = quips[category] || quips.general
    return categoryQuips[Math.floor(Math.random() * categoryQuips.length)]
}

export const getErrorMessage = (error, context = 'general') => {
    if (typeof error === 'string') {
        return error
    }

    if (error?.message) {
        // Try to match common error patterns
        const message = error.message.toLowerCase()

        if (message.includes('connection') || message.includes('connect')) {
            if (message.includes('refused')) return errorMessages.connection.refused
            if (message.includes('timeout')) return errorMessages.connection.timeout
            return errorMessages.connection.failed
        }

        if (message.includes('network')) {
            return errorMessages.general.networkError
        }

        if (message.includes('timeout')) {
            return errorMessages.general.timeout
        }

        return error.message
    }

    return errorMessages.general.unknown
}