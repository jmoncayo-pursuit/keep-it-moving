# KIM Setup Guide 🚀

Complete setup guide for Keep-It-Moving (KIM) - get up and running in under 2 minutes!

## Prerequisites ✅

### System Requirements

- **Node.js**: v16 or higher
- **Operating System**: macOS, Windows, or Linux
- **VS Code**: v1.85+ with GitHub Copilot extension
- **Browser**: Chrome, Firefox, or Safari (for PWA)

### Quick Check

Run the health check to verify your system:

```bash
kim doctor
```

## Installation Methods 📦

### Method 1: Quick Install (Recommended)

#### macOS/Linux
```bash
curl -sSL https://raw.githubusercontent.com/your-username/keep-it-moving/main/scripts/install.sh | bash
```

#### Windows (PowerShell as Admin)
```powershell
iwr -useb https://raw.githubusercontent.com/your-username/keep-it-moving/main/scripts/install.ps1 | iex
```

### Method 2: Manual Download

1. Go to [Releases](https://github.com/your-username/keep-it-moving/releases)
2. Download the appropriate binary for your platform:
   - `kim-macos-x64` or `kim-macos-arm64` (macOS)
   - `kim-windows-x64.exe` (Windows)
   - `kim-linux-x64` (Linux)
3. Run the installer script for your platform

### Method 3: Build from Source

```bash
# Clone repository
git clone https://github.com/your-username/keep-it-moving.git
cd keep-it-moving

# Setup all components
npm run setup

# Build CLI
npm run build
```

## VS Code Extension Setup 🔧

### Option 1: VS Code Marketplace (Coming Soon)

```bash
code --install-extension kim-extension
```

### Option 2: Manual Installation

1. Download `kim-extension.vsix` from releases
2. Install in VS Code:
   ```bash
   code --install-extension kim-extension.vsix
   ```

### Option 3: Development Installation

```bash
cd extension
npm install
npm run compile
# Press F5 in VS Code to launch extension development host
```

## First Run 🎉

### 1. Start KIM Server

```bash
# Start server (default port 8080)
kim start

# Or with custom port
kim start --port 8081

# Run as daemon (background)
kim start --daemon
```

### 2. Verify Server Status

```bash
kim status
```

You should see:
```
📊 KIM Server Status

🖥️  Server: 🟢 Running
🔗 Connection: 🟢 Connected  
🤖 Copilot: 🟢 Available
🔐 Pairing: ⏳ No active code
🌐 Port: 8080
```

### 3. Generate Pairing Code

In VS Code:
1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Run: `KIM: Show Pairing Code`
3. Note the 6-digit code

### 4. Pair Your Device

#### Mobile/Tablet (QR Code)
1. Open `http://localhost:8080` on your device
2. Scan QR code with camera
3. Follow pairing instructions

#### Any Device (Manual Code)
1. Open `http://localhost:8080`
2. Switch to "Manual" mode
3. Enter the 6-digit code from VS Code
4. Click "Pair Device"

### 5. Send Your First Prompt! 🚀

1. Type a prompt in the PWA: "Explain this function"
2. Click "Send to Copilot"
3. Check VS Code - your prompt should appear in Copilot chat!

## Troubleshooting 🔧

### Common Issues

#### Server Won't Start
```bash
# Check if port is in use
kim doctor

# Try different port
kim start --port 8081

# Check logs
kim start --verbose
```

#### Can't Connect from Device
1. Ensure both devices are on same network
2. Check firewall settings
3. Try accessing `http://[your-ip]:8080` instead of localhost

#### VS Code Extension Not Working
1. Verify Copilot extension is installed and active
2. Restart VS Code
3. Check extension logs in Developer Console

#### Pairing Code Expired
1. Generate new code: `KIM: Show Pairing Code`
2. Codes expire after 10 minutes
3. Use the fresh code for pairing

### Advanced Troubleshooting

#### Enable Debug Mode
```bash
# Server with verbose logging
kim start --verbose

# Check connection health
kim status

# View system information
kim info
```

#### Reset Everything
```bash
# Stop server
kim stop

# Clear any cached data
rm -rf ~/.kim/

# Restart
kim start
```

#### Network Issues
```bash
# Check network connectivity
ping [your-computer-ip]

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8080
```

## Configuration ⚙️

### Server Configuration

Create `~/.kim/config.json`:
```json
{
  "port": 8080,
  "host": "localhost",
  "tokenExpiry": "24h",
  "maxConnections": 50,
  "enableLogging": true
}
```

### PWA Configuration

The PWA automatically detects device type and adjusts UI accordingly:
- **Phone**: QR code pairing by default
- **Tablet/Laptop**: Manual code entry by default

### VS Code Extension Configuration

In VS Code settings:
```json
{
  "kim.autoStartServer": false,
  "kim.serverPort": 8080,
  "kim.showStatusBar": true,
  "kim.enableNotifications": true
}
```

## Development Setup 🛠️

### Prerequisites for Development

- Node.js 16+
- npm or yarn
- VS Code
- Git

### Development Workflow

```bash
# Clone and setup
git clone https://github.com/your-username/keep-it-moving.git
cd keep-it-moving
npm run setup

# Start development environment
npm run dev
# This starts:
# - Server with hot reload
# - PWA development server
# - Extension in development mode

# Run tests
npm test

# Build for production
npm run build
```

### Component Development

#### Server Development
```bash
cd server
npm run dev  # Starts with nodemon
npm test     # Run server tests
```

#### PWA Development
```bash
cd pwa
npm run dev  # Starts Vite dev server
npm test     # Run React tests
npm run build # Build for production
```

#### Extension Development
```bash
cd extension
npm run compile  # Compile TypeScript
npm run watch    # Watch mode
# Press F5 in VS Code to test
```

## Performance Optimization 🚀

### Server Performance
- Default configuration handles 50 concurrent connections
- Adjust `maxConnections` in config for higher loads
- Use `--daemon` mode for production deployments

### Network Performance
- KIM works best on same WiFi network
- Ethernet connections provide lowest latency
- 5GHz WiFi recommended over 2.4GHz

### Device Performance
- PWA caches resources for offline use
- Minimal battery impact on mobile devices
- Works well on devices with 1GB+ RAM

## Security Considerations 🔒

### Network Security
- KIM only accepts connections from local network
- No internet connectivity required or used
- All communication encrypted via WebSocket

### Authentication
- UUID-based tokens for device pairing
- Tokens expire after 24 hours
- Pairing codes expire after 10 minutes

### Data Privacy
- No data sent to external servers
- No analytics or tracking
- All processing happens locally

## Next Steps 🎯

Once you have KIM running:

1. **Explore Features**: Try vibe check mode, quick prompts, and recent prompts
2. **Customize**: Adjust settings for your workflow
3. **Share**: Show teammates how to set up KIM
4. **Contribute**: Join the development community
5. **Have Fun**: Enjoy the joyful coding experience! 🎉

## Getting Help 🆘

- **Documentation**: Check other files in `docs/`
- **Issues**: Report bugs on [GitHub Issues](https://github.com/your-username/keep-it-moving/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/your-username/keep-it-moving/discussions)
- **Health Check**: Run `kim doctor` for system diagnostics

---

Happy coding with KIM! 🚀✨