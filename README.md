# Keep-It-Moving (KIM) 🚀

> Relay prompts from any device to VS Code Copilot with joyful, local-first magic! ✨

![KIM Demo](docs/demo.gif)

## What is Keep-It-Moving? 🤔

Keep-It-Moving (KIM) lets you send prompts to GitHub Copilot from **any device** - your phone, tablet, or laptop - all while keeping everything local and secure. No cloud dependencies, just pure local network magic! 🎩✨

### The Problem 😤

- You're coding on your laptop but want to send a quick prompt from your phone
- You're in a meeting and want to queue up Copilot prompts for later
- You're away from your desk but have a brilliant idea for your code
- You want to collaborate with teammates by sending prompts to their VS Code

### The Solution 🎯

KIM creates a local WebSocket relay server that connects your devices to VS Code, enabling seamless prompt delivery with:

- 🌐 **Local-first**: No internet required, works on your LAN
- 📱 **Cross-device**: Phone, tablet, laptop - they all work!
- 🎨 **Joyful UX**: Emoji-driven feedback and playful error messages
- ⚡ **Fast**: < 2 second prompt delivery
- 🔒 **Secure**: UUID token-based authentication
- 🎉 **Fun**: "Vibe check" mode with motivational quips!

## Quick Start (< 2 minutes) ⏱️

### 1. Install KIM CLI

```bash
# macOS/Linux
curl -sSL https://github.com/your-username/keep-it-moving/releases/latest/download/install.sh | bash

# Windows (PowerShell as Admin)
iwr -useb https://github.com/your-username/keep-it-moving/releases/latest/download/install.ps1 | iex

# Or build from source
git clone https://github.com/your-username/keep-it-moving.git
cd keep-it-moving
npm run setup
```

### 2. Start the Server

```bash
kim start
```

### 3. Install VS Code Extension

```bash
# Install from marketplace
code --install-extension kim-extension

# Or install from VSIX
code --install-extension dist/kim-extension.vsix
```

### 4. Pair Your Device

1. Open VS Code and run: `KIM: Show Pairing Code`
2. Open `http://localhost:8080` on your phone/device
3. Enter the 6-digit code or scan QR code
4. Start sending prompts! 🎉

## Features 🌟

### 🚀 Core Features

- **WebSocket Relay**: Real-time prompt delivery via local WebSocket server
- **Device Pairing**: Secure 6-digit code or QR code pairing
- **Cross-Platform**: Works on macOS, Windows, Linux
- **PWA Support**: Install as app on mobile devices
- **Auto-Reconnection**: Handles network hiccups gracefully

### 🎨 Joyful UX Features

- **Emoji Status**: 🟢 Connected, 🔴 Disconnected, 📤 Sending
- **Playful Errors**: "Code took a coffee break! ☕"
- **Vibe Check Mode**: Random motivational quips
- **Animated QR Codes**: Bouncing cursor and fun animations
- **Toast Notifications**: System notifications for status updates

### 🔧 Developer Features

- **CLI Management**: Start, stop, status commands
- **Health Checks**: System requirements validation
- **Performance Monitoring**: < 2s response time, 95% success rate
- **Comprehensive Testing**: Unit, integration, and performance tests
- **Cross-Platform Packaging**: Binaries for all major platforms

## Architecture 🏗️

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    vscode.postMessage    ┌─────────────────┐
│   Mobile PWA    │ ◄──────────────► │   KIM Server    │ ◄─────────────────────► │   VS Code Ext   │
│                 │                  │                 │                         │                 │
│ • React App     │                  │ • Node.js       │                         │ • Copilot       │
│ • QR Pairing    │                  │ • WebSocket     │                         │   Integration   │
│ • Prompt Input  │                  │ • Token Auth    │                         │ • Status Bar    │
└─────────────────┘                  └─────────────────┘                         └─────────────────┘
```

### Components

- **Server** (`server/`): Node.js WebSocket relay server
- **PWA** (`pwa/`): React Progressive Web App for mobile devices
- **Extension** (`extension/`): VS Code extension for Copilot integration
- **CLI** (`cli/`): Command-line interface for server management

## Demo Scenarios 🎬

### Scenario 1: Mobile Coding Assistant 📱

1. You're reviewing code on GitHub mobile
2. Open KIM PWA, send prompt: "Explain this React hook"
3. Switch to VS Code on laptop
4. Prompt appears in Copilot chat instantly! ⚡

### Scenario 2: Meeting Multitasking 👥

1. In a meeting, hear about a bug
2. Quickly send prompt from phone: "Add error handling for null user"
3. After meeting, prompts are waiting in VS Code
4. Copilot helps implement the fix! 🔧

### Scenario 3: Collaborative Coding 🤝

1. Pair programming session
2. Teammate sends prompts from their device
3. Both see prompts in VS Code
4. Faster iteration and idea sharing! 🚀

## Technical Highlights 💻

### Performance Targets ✅

- **Setup Time**: < 2 minutes from install to first prompt
- **Response Time**: < 2 seconds for prompt delivery
- **Success Rate**: 95% on local network
- **Runtime Size**: < 20MB total footprint

### Security Features 🔒

- **Local Network Only**: No internet dependencies
- **UUID Token Auth**: Secure device pairing
- **Session Management**: 24-hour token expiry
- **Input Validation**: Prevents malicious payloads

### Reliability Features 🛡️

- **Auto-Reconnection**: Exponential backoff strategy
- **Offline Queue**: Stores prompts when disconnected
- **Heartbeat Monitoring**: Detects connection health
- **Graceful Degradation**: Fallback to clipboard copy

## Development 🛠️

### Prerequisites

- Node.js 16+
- VS Code with GitHub Copilot extension
- Modern browser (Chrome, Firefox, Safari)

### Setup

```bash
# Clone and setup
git clone https://github.com/your-username/keep-it-moving.git
cd keep-it-moving
npm run setup

# Start development environment
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Project Structure

```
keep-it-moving/
├── server/          # WebSocket relay server
├── pwa/            # React Progressive Web App
├── extension/      # VS Code extension
├── cli/            # Command-line interface
├── scripts/        # Build and deployment scripts
├── docs/           # Documentation and demos
└── dist/           # Built artifacts
```

## Testing 🧪

KIM includes comprehensive testing:

```bash
# Run all tests
npm test

# Performance tests
npm run test:performance

# Component-specific tests
cd server && npm test
cd pwa && npm test
cd extension && npm test
```

### Test Coverage

- **Unit Tests**: All core functionality
- **Integration Tests**: End-to-end prompt flow
- **Performance Tests**: Response time and reliability
- **Cross-Platform Tests**: macOS, Windows, Linux

## Contributing 🤝

Contributions are welcome! This project is built with ❤️ for the developer community.

### Quick Contribution Guide

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run the test suite: `npm test`
5. Submit a PR with emoji-filled commit messages! 🎉

### Code Style

- Use emoji in commit messages and comments 😄
- Keep functions small and focused
- Add tests for new features
- Follow the existing playful tone

## The Story 📖

Keep-It-Moving was born from a simple frustration: "Why can't I send a Copilot prompt from my phone?" 

The solution uses a local-first approach that keeps everything secure and fast. The result is a joyful, emoji-filled experience that makes coding more collaborative and fun!

### What Makes Keep-It-Moving Special? ✨

- **Local-First Philosophy**: No cloud, no tracking, just pure local magic
- **Joyful UX**: Every interaction has personality and fun
- **Developer-Focused**: Built for developers who love efficient workflows
- **Creative Solutions**: Fast iteration, innovative approach, lots of emoji! 🚀

## Roadmap 🗺️

- [ ] **Voice Prompts**: Send prompts via voice commands
- [ ] **Team Collaboration**: Multi-user prompt sharing
- [ ] **Plugin Ecosystem**: Custom prompt processors
- [ ] **AI Integration**: Smart prompt suggestions
- [ ] **Mobile Keyboard**: Quick prompt shortcuts

## License 📄

MIT License - built with ❤️ for the developer community.

## Acknowledgments 🙏

- **GitHub Copilot** for the amazing AI assistance
- **VS Code Team** for the extensible platform
- **For the Love of Code 2025** for the inspiration
- **Open Source Community** for the tools and libraries

---

<div align="center">

**#ForTheLoveOfCode 2025** 🚀

Made with ❤️ and lots of ☕

[Demo](https://kim-demo.example.com) • [Docs](https://kim-docs.example.com) • [Issues](https://github.com/your-username/keep-it-moving/issues)

</div>