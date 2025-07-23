// Debug script to check extension status
// Run this in VS Code Debug Console

console.log('🔍 KIM Extension Debug Status');
console.log('============================');

// Check if embedded server exists
if (typeof embeddedServer !== 'undefined' && embeddedServer) {
    console.log('✅ Embedded server exists');
    console.log('📡 Server port:', embeddedServer.port);
    console.log('🔌 HTTP server:', embeddedServer.httpServer ? 'Running' : 'Not running');
    console.log('🌐 WebSocket server:', embeddedServer.wss ? 'Running' : 'Not running');
    console.log('👥 Connected clients:', embeddedServer.clients.size);
    console.log('🔢 Active pairing sessions:', embeddedServer.pairingSessions.size);
} else {
    console.log('❌ Embedded server not running');
}

// Check status bar
if (typeof statusBarItem !== 'undefined' && statusBarItem) {
    console.log('📊 Status bar text:', statusBarItem.text);
    console.log('💡 Status bar tooltip:', statusBarItem.tooltip);
} else {
    console.log('❌ Status bar item not found');
}

// Check current pairing code
if (typeof currentPairingCode !== 'undefined' && currentPairingCode) {
    console.log('🔢 Current pairing code:', currentPairingCode);
} else {
    console.log('❌ No pairing code generated');
}

console.log('============================');
console.log('🔧 Try running: vscode.commands.executeCommand("kim.toggleServer")');