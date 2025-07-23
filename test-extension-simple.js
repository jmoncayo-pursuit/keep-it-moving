#!/usr/bin/env node

// Simple test to verify extension code works
console.log('🧪 Testing KIM Extension Code...\n');

try {
    // Test if the extension file can be loaded
    const extensionPath = './extension/extension.js';
    console.log('📁 Loading extension from:', extensionPath);

    // Mock VS Code API
    const mockVscode = {
        window: {
            createStatusBarItem: () => ({
                show: () => { },
                hide: () => { },
                command: null,
                text: '',
                tooltip: ''
            }),
            showInformationMessage: (msg) => console.log('ℹ️ Info:', msg),
            showErrorMessage: (msg) => console.log('❌ Error:', msg),
            showWarningMessage: (msg) => console.log('⚠️ Warning:', msg)
        },
        commands: {
            registerCommand: (cmd, handler) => {
                console.log('📝 Registered command:', cmd);
                return { dispose: () => { } };
            },
            executeCommand: (cmd, ...args) => {
                console.log('🚀 Execute command:', cmd, args);
                return Promise.resolve();
            }
        },
        workspace: {
            getConfiguration: (section) => ({
                get: (key, defaultValue) => {
                    console.log('⚙️ Config get:', section + '.' + key, '=', defaultValue);
                    return defaultValue;
                }
            })
        },
        languages: {
            registerHoverProvider: () => ({ dispose: () => { } })
        },
        StatusBarAlignment: { Right: 1 }
    };

    // Mock require for vscode
    const originalRequire = require;
    require = function (id) {
        if (id === 'vscode') {
            return mockVscode;
        }
        return originalRequire.apply(this, arguments);
    };

    // Load the extension
    const extension = require(extensionPath);

    console.log('✅ Extension loaded successfully!');
    console.log('📋 Extension exports:', Object.keys(extension));

    // Test activation
    if (extension.activate) {
        console.log('\n🚀 Testing activation...');

        const mockContext = {
            subscriptions: []
        };

        extension.activate(mockContext);
        console.log('✅ Extension activated successfully!');
        console.log('📝 Registered', mockContext.subscriptions.length, 'subscriptions');

        // Test deactivation
        if (extension.deactivate) {
            console.log('\n👋 Testing deactivation...');
            extension.deactivate();
            console.log('✅ Extension deactivated successfully!');
        }
    }

    console.log('\n🎉 Extension code test completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Open VS Code in this directory: code .');
    console.log('   2. Press F5 to run extension in debug mode');
    console.log('   3. In the new window, open Command Palette (Cmd+Shift+P)');
    console.log('   4. Type "KIM" to see available commands');
    console.log('   5. Try "KIM: Toggle Relay Server" to start the server');

} catch (error) {
    console.log('❌ Extension test failed:', error.message);
    console.log('\n🔧 Possible issues:');
    console.log('   - Missing dependencies (run: cd extension && npm install)');
    console.log('   - Syntax errors in extension.js');
    console.log('   - Missing required modules');

    process.exit(1);
}