# KIM Technical Constraints

## Architecture Requirements
- **Flexible Communication**: Support both local network and internet-based communication
- **WebSocket Communication**: Use WebSocket for real-time communication (local or remote)
- **VS Code Integration**: Use workbench.action.chat.open API for direct Copilot prompt injection
- **Secure Authentication**: Token-based authentication for device pairing and communication

## Performance Targets
- Setup time: Minimal setup complexity
- Prompt relay: Reliable delivery across network types
- Runtime size: Lightweight implementation
- Response time: Fast prompt delivery

## Platform Support
- **Operating Systems**: macOS, Windows, Linux
- **Node.js**: v16 or higher required
- **VS Code**: v1.85+ with GitHub Copilot extension
- **Browsers**: Chrome, Firefox, Safari (PWA support)

## Dependencies
- **Server**: WebSocket library, authentication, minimal core packages
- **PWA**: React, Tailwind CSS, QR code support, emoji support
- **Extension**: VS Code API, WebSocket client for communication

## UX Requirements
- Mobile-first responsive design
- Emoji-based status indicators (🚀, 🐛, 📤, ☕)
- Animated QR codes with bouncing cursor
- Toast notifications for feedback
- Playful error messages and quips

## Development Principles
- Open source with MIT license
- Simple setup and user experience
- Cross-platform compatibility
- Extensible architecture for future features
- Privacy-conscious design choices

## Future Architecture Considerations

### Communication Models
- **Current**: Local network WebSocket server in VS Code extension
- **Future**: Cloud-hosted relay service for remote access
- **Hybrid**: Support both local and cloud modes based on user preference

### Deployment Options
- **Local**: Extension starts local server (current implementation)
- **Cloud**: Hosted PWA connects to cloud service that communicates with extension
- **Hybrid**: Extension can connect to either local or remote relay servers

### Security Models
- **Local**: Direct device-to-extension communication
- **Remote**: Encrypted communication through relay service
- **Authentication**: Token-based pairing regardless of communication method

### Use Cases Enabled by Cloud Architecture
- Send prompts from anywhere in the world to your IDE
- Multiple devices connected simultaneously
- Persistent prompt history across devices
- Team collaboration features
- Mobile app integration