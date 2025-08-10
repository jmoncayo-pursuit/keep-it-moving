#!/usr/bin/env node

// Test KIM Extension with Fresh VS Code Instance (Cross-platform)
// This script creates a clean VS Code profile and tests the extension

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Testing KIM Extension with Fresh VS Code Instance');
console.log('==================================================');

// Performance tracking
const startTime = Date.now();

// Create a temporary directory for the test profile
const testProfileDir = path.join(os.tmpdir(), `kim-test-profile-${Date.now()}`);
console.log(`📁 Creating test profile directory: ${testProfileDir}`);

try {
    fs.mkdirSync(testProfileDir, { recursive: true });
} catch (error) {
    console.error('❌ Failed to create test profile directory:', error.message);
    process.exit(1);
}

// Package the extension first
console.log('📦 Packaging extension...');
const packageProcess = spawn('npm', ['run', 'package'], {
    cwd: path.join(__dirname, 'extension'),
    stdio: 'inherit'
});

packageProcess.on('close', (code) => {
    if (code !== 0) {
        console.log('❌ Failed to package extension');
        process.exit(1);
    }

    // Get the extension file path
    const extensionFile = path.join(__dirname, 'extension', 'kim-vscode-extension-1.0.0.vsix');
    console.log(`📄 Extension file: ${extensionFile}`);

    console.log('🚀 Starting fresh VS Code instance...');
    console.log(`   - Clean profile: ${testProfileDir}`);
    console.log(`   - Root folder: ${__dirname}`);
    console.log(`   - Extension: ${extensionFile}`);
    console.log('');

    // Determine VS Code command based on platform
    const vscodeCmd = process.platform === 'win32' ? 'code.cmd' : 'code';

    // Start VS Code with clean profile and install extension
    const vscodeProcess = spawn(vscodeCmd, [
        '--user-data-dir', testProfileDir,
        '--extensions-dir', path.join(testProfileDir, 'extensions'),
        '--install-extension', extensionFile,
        '--new-window',
        __dirname,
        '--wait'
    ], {
        stdio: 'inherit'
    });

    vscodeProcess.on('close', (code) => {
        console.log('');
        console.log('✅ VS Code session completed');
        console.log('🧹 Cleaning up test profile...');

        // Clean up test profile
        fs.rmSync(testProfileDir, { recursive: true, force: true });
        console.log('✨ Test complete!');
    });

    vscodeProcess.on('error', (error) => {
        console.error('❌ Failed to start VS Code:', error.message);
        // Clean up on error
        fs.rmSync(testProfileDir, { recursive: true, force: true });
        process.exit(1);
    });
});

packageProcess.on('error', (error) => {
    console.error('❌ Failed to package extension:', error.message);
    process.exit(1);
});