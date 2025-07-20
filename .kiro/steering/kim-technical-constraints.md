# KIM Technical Constraints

## Architecture Requirements
- **Local Network Only**: All communication must stay on LAN, no internet dependencies
- **WebSocket Communication**: Use ws library for real-time device-to-server communication
- **VS Code Integration**: Must use vscode.postMessage API to inject prompts into Copilot chat panel
- **Token Authentication**: UUID-based tokens for device pairing security

## Performance Targets
- Setup time: < 2 minutes
- Prompt relay success: 95% on LAN
- Runtime size: < 20MB
- Response time: < 2 seconds for prompt delivery

## Platform Support
- **Operating Systems**: macOS, Windows, Linux
- **Node.js**: v16 or higher required
- **VS Code**: v1.85+ with GitHub Copilot extension
- **Browsers**: Chrome, Firefox, Safari (PWA support)

## Dependencies
- **Server**: ws (WebSocket), minimal additional packages
- **PWA**: React, Tailwind CSS, react-qr-code, twemoji
- **Extension**: VS Code API only, no external dependencies

## UX Requirements
- Mobile-first responsive design
- Emoji-based status indicators (🚀, 🐛, 📤, ☕)
- Animated QR codes with bouncing cursor
- Toast notifications for feedback
- Playful error messages and quips

## Hackathon Considerations
- Must include GIF demo for README
- #ForTheLoveOfCode tag integration
- Focus on demo appeal and "wow factor"
- Open source with MIT license
- Clear setup documentation