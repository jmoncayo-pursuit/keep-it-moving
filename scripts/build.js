#!/usr/bin/env node

// KIM Build Script
// Cross-platform packaging and distribution 📦

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('📦 KIM Build System');
console.log('==================\n');

const buildTargets = {
    'macos-x64': {
        platform: 'darwin',
        arch: 'x64',
        extension: '',
        emoji: '🍎'
    },
    'macos-arm64': {
        platform: 'darwin',
        arch: 'arm64',
        extension: '',
        emoji: '🍎'
    },
    'windows-x64': {
        platform: 'win32',
        arch: 'x64',
        extension: '.exe',
        emoji: '🪟'
    },
    'linux-x64': {
        platform: 'linux',
        arch: 'x64',
        extension: '',
        emoji: '🐧'
    }
};

async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, {
            stdio: 'inherit',
            ...options
        });

        process.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });
    });
}

async function buildPWA() {
    console.log('📱 Building PWA...');

    const pwaPath = path.join(__dirname, '..', 'pwa');

    try {
        await runCommand('npm', ['run', 'build'], { cwd: pwaPath });
        console.log('✅ PWA build complete\n');
    } catch (error) {
        console.error('❌ PWA build failed:', error.message);
        throw error;
    }
}

async function buildCLI() {
    console.log('🔧 Building CLI executables...');

    const cliPath = path.join(__dirname, '..', 'cli');
    const distPath = path.join(__dirname, '..', 'dist');

    // Ensure dist directory exists
    if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
    }

    try {
        // Install CLI dependencies
        await runCommand('npm', ['install'], { cwd: cliPath });

        // Build for each target
        for (const [targetName, target] of Object.entries(buildTargets)) {
            console.log(`${target.emoji} Building for ${targetName}...`);

            const outputName = `kim-${targetName}${target.extension}`;
            const outputPath = path.join(distPath, outputName);

            await runCommand('npx', [
                'pkg',
                'kim.js',
                '--target', `node16-${target.platform}-${target.arch}`,
                '--output', outputPath
            ], { cwd: cliPath });

            console.log(`✅ Built ${outputName}`);
        }

        console.log('✅ CLI build complete\n');
    } catch (error) {
        console.error('❌ CLI build failed:', error.message);
        throw error;
    }
}

async function packageExtension() {
    console.log('🔧 Packaging VS Code extension...');

    const extensionPath = path.join(__dirname, '..', 'extension');
    const distPath = path.join(__dirname, '..', 'dist');

    try {
        // Install vsce if not available
        try {
            await runCommand('npx', ['vsce', '--version']);
        } catch {
            console.log('Installing vsce...');
            await runCommand('npm', ['install', '-g', 'vsce']);
        }

        // Package extension
        await runCommand('npx', ['vsce', 'package', '--out', path.join(distPath, 'kim-extension.vsix')], {
            cwd: extensionPath
        });

        console.log('✅ Extension packaged\n');
    } catch (error) {
        console.error('❌ Extension packaging failed:', error.message);
        throw error;
    }
}

async function createInstallers() {
    console.log('📦 Creating installers...');

    const distPath = path.join(__dirname, '..', 'dist');
    const scriptsPath = path.join(__dirname);

    // Create install scripts for each platform
    const installScripts = {
        'install-macos.sh': `#!/bin/bash
# KIM macOS Installer
echo "🍎 Installing KIM for macOS..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    BINARY="kim-macos-arm64"
else
    BINARY="kim-macos-x64"
fi

# Copy binary to /usr/local/bin
sudo cp "$BINARY" /usr/local/bin/kim
sudo chmod +x /usr/local/bin/kim

echo "✅ KIM installed successfully!"
echo "💡 Run 'kim --help' to get started"
`,

        'install-linux.sh': `#!/bin/bash
# KIM Linux Installer
echo "🐧 Installing KIM for Linux..."

# Copy binary to /usr/local/bin
sudo cp kim-linux-x64 /usr/local/bin/kim
sudo chmod +x /usr/local/bin/kim

echo "✅ KIM installed successfully!"
echo "💡 Run 'kim --help' to get started"
`,

        'install-windows.bat': `@echo off
REM KIM Windows Installer
echo 🪟 Installing KIM for Windows...

REM Copy to Program Files
if not exist "%ProgramFiles%\\KIM" mkdir "%ProgramFiles%\\KIM"
copy kim-windows-x64.exe "%ProgramFiles%\\KIM\\kim.exe"

REM Add to PATH (requires admin)
setx PATH "%PATH%;%ProgramFiles%\\KIM" /M

echo ✅ KIM installed successfully!
echo 💡 Run 'kim --help' to get started
pause
`
    };

    for (const [filename, content] of Object.entries(installScripts)) {
        const scriptPath = path.join(distPath, filename);
        fs.writeFileSync(scriptPath, content);

        if (filename.endsWith('.sh')) {
            fs.chmodSync(scriptPath, '755');
        }
    }

    console.log('✅ Installers created\n');
}

async function createDistributionPackage() {
    console.log('📦 Creating distribution package...');

    const distPath = path.join(__dirname, '..', 'dist');
    const packageInfo = {
        name: 'Keep-It-Moving (KIM)',
        version: '1.0.0',
        description: 'Relay prompts from any device to VS Code Copilot',
        platforms: Object.keys(buildTargets),
        files: fs.readdirSync(distPath),
        installation: {
            macos: 'Run install-macos.sh',
            linux: 'Run install-linux.sh',
            windows: 'Run install-windows.bat as administrator'
        },
        usage: 'Run "kim --help" for available commands'
    };

    fs.writeFileSync(
        path.join(distPath, 'package-info.json'),
        JSON.stringify(packageInfo, null, 2)
    );

    // Create README for distribution
    const readmeContent = `# Keep-It-Moving (KIM) Distribution

🚀 Relay prompts from any device to VS Code Copilot

## Installation

### macOS
\`\`\`bash
chmod +x install-macos.sh
./install-macos.sh
\`\`\`

### Linux
\`\`\`bash
chmod +x install-linux.sh
./install-linux.sh
\`\`\`

### Windows
Run \`install-windows.bat\` as administrator

## Usage

After installation, run:
\`\`\`bash
kim --help
\`\`\`

## Quick Start

1. Start the server: \`kim start\`
2. Install the VS Code extension: \`code --install-extension kim-extension.vsix\`
3. Open the PWA in your browser: \`http://localhost:8080\`
4. Pair your device and start sending prompts!

## Files

- \`kim-*\` - CLI executables for different platforms
- \`kim-extension.vsix\` - VS Code extension
- \`install-*\` - Installation scripts
- \`pwa/\` - Progressive Web App files

## Support

For issues and documentation, visit: https://github.com/your-username/keep-it-moving
`;

    fs.writeFileSync(path.join(distPath, 'README.md'), readmeContent);

    console.log('✅ Distribution package created\n');
}

async function main() {
    const startTime = Date.now();

    try {
        // Build all components
        await buildPWA();
        await buildCLI();
        await packageExtension();
        await createInstallers();
        await createDistributionPackage();

        const duration = Date.now() - startTime;

        console.log('🎉 Build Complete!');
        console.log('==================');
        console.log(`⏱️  Total time: ${Math.round(duration / 1000)}s`);
        console.log(`📁 Output: ${path.join(__dirname, '..', 'dist')}`);
        console.log('\n📦 Distribution files:');

        const distPath = path.join(__dirname, '..', 'dist');
        const files = fs.readdirSync(distPath);
        files.forEach(file => {
            const stats = fs.statSync(path.join(distPath, file));
            const size = (stats.size / 1024 / 1024).toFixed(1);
            console.log(`  ${file} (${size}MB)`);
        });

    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };