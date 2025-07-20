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
2. Run: `KIM: Toggle Server` to start the server
3. Run: `KIM: Show Pairing Code` to get your code

### 3. Connect Your Device

1. Open the PWA URL shown in VS Code
2. Enter the 6-digit code or scan QR code  
3. Start sending prompts!

## Current Features

- **VS Code Extension**: Integrates with Copilot chat
- **Device Pairing**: 6-digit code or QR code pairing
- **PWA Interface**: Web app for mobile devices
- **WebSocket Communication**: Real-time prompt relay

## How It Works

1. VS Code extension starts a local WebSocket server
2. Extension generates a pairing code
3. Device connects to PWA using the code
4. Prompts sent from device appear in VS Code Copilot chat

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