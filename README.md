# Keep-It-Moving (KIM) 🚀

> Send prompts to VS Code Copilot from any device

## What is Keep-It-Moving? 

Keep-It-Moving (KIM) lets you send prompts to GitHub Copilot from your phone, tablet, or other devices. Install the VS Code extension, generate a pairing code, and start sending prompts remotely.

## Quick Start

### 1. Install VS Code Extension

```bash
# Build from source (marketplace version coming soon)
git clone https://github.com/jmoncayo-pursuit/keep-it-moving.git
cd keep-it-moving/extension
npm install
npx vsce package
code --install-extension kim-vscode-extension-1.0.0.vsix
```

### 2. Generate Pairing Code

1. Open VS Code Command Palette (Ctrl/Cmd+Shift+P)
2. Run: `KIM: Show Pairing Code` (auto-starts server)
3. QR code and pairing code appear in VS Code panel

### 3. Connect Your Device

**Option A: QR Code (Recommended)**
1. Scan QR code with your phone
2. PWA opens automatically
3. Enter the 6-digit code shown in VS Code
4. Start sending prompts!

**Option B: Manual**
1. Visit the URL shown in VS Code (e.g., `http://192.168.1.59:8080`)
2. Enter the 6-digit pairing code
3. Start sending prompts!

## Technical Breakthroughs
- **Embedded Server**: First-of-its-kind WebSocket server running inside VS Code extension
- **Self-Hosting PWA**: Complete web app served directly from extension (no external hosting)
- **Dynamic Port Discovery**: Intelligent fallback system for bulletproof startup
- **Real-Time Integration**: Direct GitHub Copilot chat injection with sub-second delivery

### 🎉 **Joyful User Experience**  
- **QR Code Auto-Pairing**: Scan → auto-fill → connect seamlessly
- **Emoji-Driven Feedback**: 🚀📱🎉 throughout the experience
- **Playful Error Messages**: "Your coding session took a coffee break! ☕"
- **Stacked Notifications**: Beautiful, non-intrusive feedback system

### 🔐 **Enterprise-Grade Security**
- **UUID Token Authentication**: 122-bit cryptographic security
- **Session Management**: 24-hour expiry with automatic cleanup
- **Local-First**: Zero cloud dependencies, all traffic stays on your network
- **Multi-Device Support**: Unlimited simultaneous connections

## How It Works

1. VS Code extension starts a local WebSocket server
2. Extension generates a pairing code
3. Device connects to PWA using the code
4. Prompts sent from device appear in VS Code Copilot chat

## Architecture

🏗️ **[View Detailed Architecture](./ARCHITECTURE.md)** - See the innovative embedded server design

🎉 **[View Major Milestones](./MILESTONES.md)** - Celebrate the technical breakthroughs

## Technical Highlights

### Performance-Optimized QR Code Sharing

We've implemented a lightweight notification-based approach for sharing QR codes:

- **Notification-Based**: Instead of resource-intensive hover functionality, QR codes are displayed via notifications
- **On-Demand Generation**: QR codes are only generated when explicitly requested
- **Two-Step Process**: Simple notification with pairing code first, full QR code only when needed
- **Improved Performance**: Eliminates VS Code slowdowns and freezes that occurred with hover-based implementation

### Seamless Copilot Integration

We've created a custom hook that elegantly integrates with VS Code's Chat API for effortless prompt delivery:

```javascript
// Seamless integration with VS Code Chat API
await vscode.commands.executeCommand('workbench.action.chat.open', {
    query: prompt
});
```

This elegant solution provides:
- **Instant Delivery**: Prompts appear immediately in Copilot chat
- **Native Integration**: Uses VS Code's official Chat API
- **Context Preservation**: Maintains conversation flow between prompts
- **Full Character Support**: Handles emoji and special characters perfectly

## Extension Commands

Once installed, KIM adds these commands to VS Code:

- **KIM: Toggle Server** - Start/stop the local relay server
- **KIM: Show Pairing Code** - Generate and display QR code for device pairing
- **KIM: Show Status** - View connection status and server info
- **KIM: Connect to Server** - Manually connect to running server

### Using the Extension

1. **Start the Server**: Use `KIM: Toggle Server` or check the KIM status in the status bar
2. **Generate Pairing Code**: Use `KIM: Show Pairing Code` to get your QR code
3. **Check Status**: Click the KIM status bar item or use `KIM: Show Status`
4. **Stop Server**: Use `KIM: Toggle Server` again to stop

### Troubleshooting

- **Server won't start**: Check if port 8080-8084 are available
- **No pairing code**: Make sure server is running first
- **VS Code slow**: Restart VS Code if you experience performance issues
- **Connection issues**: Use `KIM: Connect to Server` to reconnect

## Development

### Prerequisites
- Node.js 16+
- VS Code with GitHub Copilot extension

### Setup
```bash
git clone https://github.com/jmoncayo-pursuit/keep-it-moving.git
cd keep-it-moving
npm install
cd server && npm install
cd ../pwa && npm install  
cd ../extension && npm install
```

### Run Development
```bash
# Start server and PWA
npm run dev

# In another terminal, test the extension
cd extension
code --extensionDevelopmentPath=$(pwd)
```

## Future Features

- Voice prompts
- Team collaboration  
- Plugin ecosystem
- AI integration
- Mobile keyboard shortcuts

## License

MIT License

---

<div align="center">

**#ForTheLoveOfCode 2025** 🚀

</div>