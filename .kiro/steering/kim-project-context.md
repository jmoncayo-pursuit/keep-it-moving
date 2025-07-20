# KIM Project Context

## Project Overview
Keep-It-Moving (KIM) is a hackathon project for "For the Love of Code 2025" that enables developers to send prompts from any device to VS Code's GitHub Copilot chat with a joyful, local-first approach.

## Key Characteristics
- **Local-first**: No cloud dependencies, all communication over local network
- **Joyful UX**: Emoji-driven feedback, playful error messages, "vibe check" mode with quips
- **Cross-device**: Supports phones, tablets, laptops with responsive PWA
- **Secure**: UUID token-based authentication, WebSocket communication
- **Hackathon-focused**: Designed for demo appeal with animated QR codes, GIFs, #ForTheLoveOfCode

## Technical Stack
- **Backend**: Node.js (v16+) with ws WebSocket library
- **Frontend**: React PWA with Tailwind CSS, react-qr-code, twemoji
- **VS Code Extension**: Uses vscode.postMessage to inject into Copilot chat
- **Platforms**: macOS, Windows, Linux support required

## Development Priorities
1. Minimal viable implementation first
2. Playful UX elements (emojis, animations, quips)
3. Reliable local network communication
4. Quick setup (< 2 minutes)
5. Hackathon demo appeal

## Code Style Preferences
- Keep implementations lightweight and focused
- Include emoji and playful elements in user-facing features
- Prioritize local-first architecture decisions
- Use modern JavaScript/React patterns
- Focus on cross-platform compatibility