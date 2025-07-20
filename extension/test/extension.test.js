// Extension tests for Keep-It-Moving VS Code Extension

const assert = require('assert');
const vscode = require('vscode');

suite('KIM Extension Test Suite', () => {
    vscode.window.showInformationMessage('🧪 Starting KIM extension tests!');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('kim-team.kim-vscode-extension'));
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        assert.ok(commands.includes('kim.showPairingCode'), 'showPairingCode command should be registered');
        assert.ok(commands.includes('kim.toggleServer'), 'toggleServer command should be registered');
        assert.ok(commands.includes('kim.showStatus'), 'showStatus command should be registered');
    });

    test('Configuration should have default values', () => {
        const config = vscode.workspace.getConfiguration('kim');

        assert.strictEqual(config.get('serverPort'), 8080);
        assert.strictEqual(config.get('enableQuips'), true);
        assert.strictEqual(config.get('autoStartServer'), false);
    });
});