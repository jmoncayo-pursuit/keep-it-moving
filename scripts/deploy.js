#!/usr/bin/env node

// Keep-It-Moving (KIM) Deployment Script
// Builds and deploys KIM components for production 🚀

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Keep-It-Moving deployment...\n');

async function runCommand(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
        console.log(`📦 Running: ${command} in ${cwd}`);
        const child = spawn(command, { shell: true, cwd, stdio: 'inherit' });

        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });
    });
}

async function deployPWA() {
    console.log('📱 Building PWA for production...');

    const pwaPath = path.join(__dirname, '..', 'pwa');

    // Install dependencies
    await runCommand('npm install', pwaPath);

    // Build for production
    await runCommand('npm run build', pwaPath);

    console.log('✅ PWA built successfully!');
    console.log('💡 Deploy the pwa/dist folder to Netlify or your hosting provider');
    console.log('💡 Set VITE_KIM_SERVER_URL environment variable to your server URL');
}

async function packageExtension() {
    console.log('🔧 Packaging VS Code extension...');

    const extensionPath = path.join(__dirname, '..', 'extension');

    // Install dependencies
    await runCommand('npm install', extensionPath);

    // Package extension
    await runCommand('npx vsce package', extensionPath);

    console.log('✅ Extension packaged successfully!');
    console.log('💡 Install the .vsix file or publish to VS Code marketplace');
}

async function buildServer() {
    console.log('🖥️  Preparing server for deployment...');

    const serverPath = path.join(__dirname, '..', 'server');

    // Install dependencies
    await runCommand('npm install', serverPath);

    console.log('✅ Server ready for deployment!');
    console.log('💡 Deploy server/index.js to your hosting provider');
    console.log('💡 Set NODE_ENV=production for network binding');
}

async function main() {
    try {
        await deployPWA();
        console.log();

        await packageExtension();
        console.log();

        await buildServer();
        console.log();

        console.log('🎉 Keep-It-Moving deployment complete!');
        console.log('\n📋 Next steps:');
        console.log('1. Deploy PWA to Netlify (pwa/dist folder)');
        console.log('2. Deploy server to your hosting provider');
        console.log('3. Install VS Code extension (.vsix file)');
        console.log('4. Update server URL in PWA environment variables');

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

main();