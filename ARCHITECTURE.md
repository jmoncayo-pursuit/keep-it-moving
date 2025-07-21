# Keep-It-Moving Architecture

## Overview

Keep-It-Moving implements a custom WebSocket-based relay protocol that enables communication between mobile devices and VS Code extensions. This document describes the verified, working architecture.

## Core Components

### Relay Server (Node.js)
- WebSocket server using the `ws` library
- Custom JSON message protocol
- Multi-client connection management
- Token-based authentication system

### Progressive Web App (React)
- WebSocket client with auto-reconnection
- Device pairing interface
- Prompt input and delivery
- Connection state management

### VS Code Extension
- WebSocket client connection
- Direct Copilot chat integration via `workbench.action.chat.open`
- Pairing code generation
- Status bar integration

## Message Protocol

### Authentication Flow
1. VS Code extension generates 6-digit pairing code
2. Mobile device connects to relay server
3. User enters pairing code in PWA
4. Server validates code and issues UUID token
5. Device authenticated for prompt sending

### Prompt Delivery Flow
1. User types prompt in PWA
2. PWA sends prompt with authentication token
3. Relay server validates token and routes to VS Code
4. VS Code extension receives prompt
5. Extension injects prompt directly into Copilot chat

## Key Features

### Custom Message Types
- `pair` - Device authentication
- `prompt` - Prompt relay
- `register_extension` - VS Code registration
- `ping/pong` - Connection monitoring

### Connection Management
- Auto-reconnection with exponential backoff
- Heartbeat monitoring
- Connection state persistence
- Graceful error handling

### Security
- UUID token-based authentication
- Session expiry (5 minutes)
- Input validation
- Local network deployment

## Technical Innovation

The relay pattern enables cross-device communication by:
- Routing messages between different client types
- Maintaining connection state across network changes
- Providing secure device pairing
- Enabling real-time prompt delivery

This architecture could be extended for other IDE integrations or cross-device development tools.