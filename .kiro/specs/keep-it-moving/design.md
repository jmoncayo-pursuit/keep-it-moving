# Design Document

## Overview

Keep-It-Moving (KIM) is a local-first system that enables developers to send prompts from any device to VS Code's GitHub Copilot chat. The system consists of three main components: a Node.js relay server, a React PWA for devices, and a VS Code extension. All communication happens over the local network using WebSocket connections with UUID token authentication.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    WebSocket     ┌──────────────────┐    Extension API    ┌─────────────────┐
│   Device PWA    │ ◄──────────────► │  Relay Server    │ ◄─────────────────► │  VS Code Ext    │
│                 │   (Local LAN)    │                  │                     │                 │
│ • React UI      │                  │ • Node.js        │                     │ • Copilot Chat  │
│ • QR/Code Pair  │                  │ • WebSocket      │                     │ • postMessage   │
│ • Emoji Status  │                  │ • Token Auth     │                     │ • Status Update │
└─────────────────┘                  └──────────────────┘                     └─────────────────┘
```

### Component Breakdown

#### 1. Device PWA (React Application)
- **Purpose**: Provides cross-device interface for sending prompts
- **Technology**: React, Tailwind CSS, PWA manifest
- **Key Features**: 
  - Responsive design (mobile-first)
  - Animated QR code pairing
  - Manual 6-digit code entry
  - Emoji-based status indicators
  - Toast notifications
  - "Vibe check" mode integration

#### 2. Relay Server (Node.js)
- **Purpose**: Bridges device prompts to VS Code extension
- **Technology**: Node.js v16+, ws WebSocket library
- **Key Features**:
  - Local network WebSocket server
  - UUID token-based authentication
  - Prompt validation and relay
  - Status tracking with emoji responses
  - Auto-reconnection handling

#### 3. VS Code Extension
- **Purpose**: Injects prompts into Copilot chat panel
- **Technology**: VS Code Extension API v1.85+
- **Key Features**:
  - vscode.postMessage integration
  - Copilot chat panel targeting
  - Pairing code display
  - Status notifications in editor

## Components and Interfaces

### Device PWA Components

#### PairingScreen Component
```typescript
interface PairingScreenProps {
  onPaired: (token: string) => void;
  pairingMethod: 'qr' | 'manual';
}
```
- Handles QR code display with bouncing cursor animation
- Manual 6-digit code input with emoji feedback
- Stores UUID token in localStorage for persistence

#### PromptInput Component
```typescript
interface PromptInputProps {
  onSendPrompt: (prompt: string) => void;
  connectionStatus: 'connected' | 'disconnected' | 'sending';
}
```
- Text area for prompt input
- Send button with loading states
- Character count and validation
- Emoji status indicators (📤, 🚀, 🐛)

#### StatusIndicator Component
```typescript
interface StatusIndicatorProps {
  status: 'idle' | 'sending' | 'success' | 'error';
  message?: string;
  showQuip?: boolean;
}
```
- Displays current connection and operation status
- Shows playful error messages
- "Vibe check" quips integration

### Relay Server Interfaces

#### WebSocket Message Protocol
```typescript
interface DeviceMessage {
  type: 'pair' | 'prompt' | 'ping';
  token?: string;
  code?: string;
  prompt?: string;
  timestamp: number;
}

interface ServerResponse {
  type: 'paired' | 'prompt_received' | 'error' | 'status';
  success: boolean;
  message: string;
  emoji: string;
  quip?: string;
}
```

#### Authentication Service
```typescript
interface AuthService {
  generatePairingCode(): string;
  generateToken(): string;
  validateToken(token: string): boolean;
  storePairing(code: string, token: string): void;
}
```

### VS Code Extension Interfaces

#### Extension Commands
```typescript
interface KIMCommands {
  'kim.showPairingCode': () => void;
  'kim.toggleServer': () => void;
  'kim.showStatus': () => void;
}
```

#### Copilot Integration
```typescript
interface CopilotIntegration {
  injectPrompt(prompt: string): Promise<boolean>;
  validateCopilotAvailable(): boolean;
  showPromptInChat(prompt: string, quip?: string): void;
}
```

## Data Models

### Pairing Session
```typescript
interface PairingSession {
  code: string;           // 6-digit pairing code
  token: string;          // UUID authentication token
  deviceType: 'phone' | 'tablet' | 'laptop';
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}
```

### Prompt Message
```typescript
interface PromptMessage {
  id: string;
  token: string;
  prompt: string;
  timestamp: Date;
  status: 'pending' | 'delivered' | 'failed';
  deviceInfo: {
    userAgent: string;
    screenSize: string;
  };
}
```

### Server Configuration
```typescript
interface ServerConfig {
  port: number;           // Default: 8080
  host: string;          // Default: 'localhost'
  maxConnections: number; // Default: 10
  tokenExpiry: number;    // Default: 24 hours
  enableQuips: boolean;   // Default: true
}
```

## Error Handling

### Error Categories

#### Connection Errors
- **WebSocket Connection Failed**: "Oops! Can't reach your coding buddy ☕"
- **Token Expired**: "Your coding session took a coffee break! Please pair again 🔄"
- **Server Unavailable**: "The relay server is taking a power nap 😴"

#### Validation Errors
- **Invalid Prompt**: "That prompt needs some love! Try again 💝"
- **Token Mismatch**: "Hmm, that doesn't look right 🤔"
- **Rate Limiting**: "Slow down there, speed racer! ⚡"

#### VS Code Integration Errors
- **Copilot Not Available**: "Copilot seems to be out for lunch 🍕"
- **Extension Not Active**: "VS Code extension is snoozing 😪"
- **Injection Failed**: "Prompt got lost in the code maze 🌀"

### Error Recovery Strategies

#### Auto-Reconnection
```typescript
interface ReconnectionStrategy {
  maxRetries: number;     // Default: 5
  backoffMultiplier: number; // Default: 1.5
  initialDelay: number;   // Default: 1000ms
  maxDelay: number;       // Default: 30000ms
}
```

#### Graceful Degradation
- Store prompts locally when connection is lost
- Show offline status with playful messaging
- Retry queue with exponential backoff
- Clear error states with emoji transitions

## Testing Strategy

### Unit Testing
- **WebSocket Server**: Connection handling, token validation, message routing
- **React Components**: Rendering, user interactions, state management
- **VS Code Extension**: Command execution, Copilot integration, error handling

### Integration Testing
- **End-to-End Pairing**: QR code and manual code flows
- **Prompt Relay**: Device → Server → VS Code → Copilot
- **Error Scenarios**: Network failures, invalid tokens, server restarts

### Manual Testing Scenarios
1. **Cross-Device Pairing**: Test on phone, tablet, laptop
2. **Network Conditions**: WiFi switching, connection drops
3. **VS Code States**: Extension disabled, Copilot unavailable
4. **Emoji Feedback**: Verify all status indicators display correctly
5. **Quip Generation**: Test "vibe check" mode randomness

### Performance Testing
- **Latency**: Measure prompt delivery time (target: <2 seconds)
- **Reliability**: Achieve 95% success rate over 100 prompts
- **Memory Usage**: Keep server footprint under 20MB
- **Concurrent Connections**: Test multiple device connections

## Security Considerations

### Local Network Security
- **Token-Based Auth**: UUID tokens for device authentication
- **No Internet Traffic**: All communication stays on LAN
- **Token Expiry**: Automatic session timeout after 24 hours
- **Connection Limits**: Maximum 10 concurrent connections

### Data Privacy
- **No Persistent Storage**: Prompts not saved to disk
- **Memory Cleanup**: Clear tokens and messages on server restart
- **Local Only**: No telemetry or external API calls

## Deployment Architecture

### Development Setup
```
kim-project/
├── server/           # Node.js relay server
│   ├── index.js     # Main server file
│   ├── auth.js      # Authentication service
│   └── package.json # Dependencies
├── pwa/             # React PWA
│   ├── src/         # React components
│   ├── public/      # PWA manifest
│   └── package.json # Dependencies
├── extension/       # VS Code extension
│   ├── extension.js # Main extension file
│   └── package.json # Extension manifest
└── README.md        # Setup instructions
```

### Production Packaging
- **Server**: Single executable with pkg or nexe
- **PWA**: Static build served from server
- **Extension**: VSIX package for VS Code marketplace
- **Installer**: Cross-platform installer script

This design ensures KIM delivers a joyful, secure, and reliable local-first experience for developers wanting to interact with Copilot from any device.