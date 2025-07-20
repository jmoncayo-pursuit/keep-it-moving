#!/usr/bin/env node

// Keep-It-Moving (KIM) CLI
// Command-line interface for managing KIM server 🚀

const { program } = require('commander');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generatePairingCode } = require('./pair');

const packageJson = require('../package.json');

// ASCII Art for KIM
const kimLogo = `
██╗  ██╗██╗███╗   ███╗
██║ ██╔╝██║████╗ ████║
█████╔╝ ██║██╔████╔██║
██╔═██╗ ██║██║╚██╔╝██║
██║  ██╗██║██║ ╚═╝ ██║
╚═╝  ╚═╝╚═╝╚═╝     ╚═╝
Keep-It-Moving 🚀
`;

program
    .name('kim')
    .description('Keep-It-Moving CLI - Relay prompts from any device to VS Code Copilot')
    .version(packageJson.version || '1.0.0');

// Server management commands
program
    .command('start')
    .description('Start the KIM relay server 🚀')
    .option('-p, --port <port>', 'Server port', '8080')
    .option('-d, --daemon', 'Run as daemon process')
    .option('-v, --verbose', 'Verbose logging')
    .action(async (options) => {
        console.log(kimLogo);
        console.log('🚀 Starting KIM relay server...\n');

        const serverPath = path.join(__dirname, '..', 'server', 'index.js');

        if (!fs.existsSync(serverPath)) {
            console.error('❌ Server file not found:', serverPath);
            process.exit(1);
        }

        const args = [];
        if (options.port) {
            process.env.KIM_PORT = options.port;
        }
        if (options.verbose) {
            process.env.KIM_VERBOSE = 'true';
        }

        const serverProcess = spawn('node', [serverPath], {
            stdio: options.daemon ? 'ignore' : 'inherit',
            detached: options.daemon,
            env: { ...process.env }
        });

        if (options.daemon) {
            serverProcess.unref();
            console.log(`🎉 KIM server started as daemon (PID: ${serverProcess.pid})`);
            console.log(`📡 Server running on port ${options.port}`);
            console.log(`💡 Use 'kim stop' to stop the server`);

            // Save PID for stopping later
            const pidFile = path.join(os.tmpdir(), 'kim.pid');
            fs.writeFileSync(pidFile, serverProcess.pid.toString());
        } else {
            console.log(`📡 Server running on port ${options.port}`);
            console.log('💡 Press Ctrl+C to stop\n');

            serverProcess.on('exit', (code) => {
                console.log(`\n👋 Server stopped (exit code: ${code})`);
            });
        }
    });

program
    .command('stop')
    .description('Stop the KIM relay server 🛑')
    .action(() => {
        console.log('🛑 Stopping KIM server...\n');

        const pidFile = path.join(os.tmpdir(), 'kim.pid');

        if (!fs.existsSync(pidFile)) {
            console.log('ℹ️  No running server found');
            return;
        }

        const pid = fs.readFileSync(pidFile, 'utf8').trim();

        try {
            process.kill(parseInt(pid), 'SIGTERM');
            fs.unlinkSync(pidFile);
            console.log('✅ KIM server stopped successfully');
        } catch (error) {
            console.error('❌ Failed to stop server:', error.message);
            // Clean up stale PID file
            if (fs.existsSync(pidFile)) {
                fs.unlinkSync(pidFile);
            }
        }
    });

program
    .command('status')
    .description('Check KIM server status 📊')
    .action(() => {
        console.log('📊 KIM Server Status\n');

        const pidFile = path.join(os.tmpdir(), 'kim.pid');

        if (fs.existsSync(pidFile)) {
            const pid = fs.readFileSync(pidFile, 'utf8').trim();

            try {
                process.kill(parseInt(pid), 0); // Check if process exists
                console.log('🟢 Server Status: Running');
                console.log(`🆔 Process ID: ${pid}`);

                // Try to connect to check if server is responsive
                const WebSocket = require('ws');
                const ws = new WebSocket('ws://localhost:8080');

                ws.on('open', () => {
                    console.log('🔗 Connection: Responsive');
                    ws.close();
                });

                ws.on('error', () => {
                    console.log('⚠️  Connection: Not responsive');
                });

            } catch (error) {
                console.log('🔴 Server Status: Not running (stale PID file)');
                fs.unlinkSync(pidFile);
            }
        } else {
            console.log('🔴 Server Status: Not running');
        }

        console.log(`💻 Platform: ${os.platform()} ${os.arch()}`);
        console.log(`📍 Node.js: ${process.version}`);
    });

// Development commands
program
    .command('dev')
    .description('Start development environment 🛠️')
    .option('--server-only', 'Start only the server')
    .option('--pwa-only', 'Start only the PWA')
    .action((options) => {
        console.log(kimLogo);
        console.log('🛠️  Starting KIM development environment...\n');

        const processes = [];

        if (!options.pwaOnly) {
            console.log('🖥️  Starting server...');
            const serverProcess = spawn('npm', ['run', 'dev'], {
                cwd: path.join(__dirname, '..', 'server'),
                stdio: 'inherit'
            });
            processes.push(serverProcess);
        }

        if (!options.serverOnly) {
            console.log('📱 Starting PWA...');
            const pwaProcess = spawn('npm', ['run', 'dev'], {
                cwd: path.join(__dirname, '..', 'pwa'),
                stdio: 'inherit'
            });
            processes.push(pwaProcess);
        }

        // Handle cleanup
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping development environment...');
            processes.forEach(p => p.kill());
            process.exit(0);
        });
    });

program
    .command('test')
    .description('Run test suite 🧪')
    .option('--component <component>', 'Test specific component (server, pwa, extension)')
    .option('--performance', 'Run performance tests')
    .action((options) => {
        console.log('🧪 Running KIM test suite...\n');

        const testRunner = path.join(__dirname, '..', 'test-runner.js');
        const args = [];

        if (options.performance) {
            args.push('--performance');
        }

        const testProcess = spawn('node', [testRunner, ...args], {
            stdio: 'inherit'
        });

        testProcess.on('exit', (code) => {
            process.exit(code);
        });
    });

// Setup and installation commands
program
    .command('setup')
    .description('Setup KIM for first-time use 🔧')
    .action(async () => {
        console.log(kimLogo);
        console.log('🔧 Setting up KIM...\n');

        const components = ['server', 'pwa', 'extension'];

        for (const component of components) {
            console.log(`📦 Installing ${component} dependencies...`);

            const componentPath = path.join(__dirname, '..', component);

            if (fs.existsSync(path.join(componentPath, 'package.json'))) {
                await new Promise((resolve) => {
                    const installProcess = spawn('npm', ['install'], {
                        cwd: componentPath,
                        stdio: 'inherit'
                    });

                    installProcess.on('exit', resolve);
                });
            }
        }

        console.log('\n✅ KIM setup complete!');
        console.log('💡 Run "kim start" to start the server');
        console.log('💡 Run "kim dev" to start development environment');
    });

program
    .command('doctor')
    .description('Check system requirements and health 🩺')
    .action(() => {
        console.log('🩺 KIM Health Check\n');

        // Check Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

        console.log(`📍 Node.js: ${nodeVersion} ${majorVersion >= 16 ? '✅' : '❌ (requires v16+)'}`);

        // Check platform support
        const platform = os.platform();
        const supportedPlatforms = ['darwin', 'win32', 'linux'];
        console.log(`💻 Platform: ${platform} ${supportedPlatforms.includes(platform) ? '✅' : '⚠️'}`);

        // Check available ports
        const net = require('net');
        const checkPort = (port) => {
            return new Promise((resolve) => {
                const server = net.createServer();
                server.listen(port, () => {
                    server.close(() => resolve(true));
                });
                server.on('error', () => resolve(false));
            });
        };

        checkPort(8080).then(available => {
            console.log(`🔌 Port 8080: ${available ? '✅ Available' : '❌ In use'}`);
        });

        // Check VS Code
        exec('code --version', (error) => {
            console.log(`🔧 VS Code: ${error ? '⚠️  Not found in PATH' : '✅ Available'}`);
        });

        console.log('\n💡 Run "kim setup" if you need to install dependencies');
    });

// Pairing code command
program
    .command('pair')
    .description('Generate a pairing code for devices 🔢')
    .option('-p, --port <port>', 'Server port', '8080')
    .action(async (options) => {
        console.log(kimLogo);
        console.log('🔢 Generating pairing code...\n');

        try {
            await generatePairingCode(options.port);
        } catch (error) {
            console.error(`❌ Failed to generate pairing code: ${error.message}`);
            process.exit(1);
        }
    });

// Info commands
program
    .command('info')
    .description('Show KIM information ℹ️')
    .action(() => {
        console.log(kimLogo);
        console.log('ℹ️  KIM Information\n');
        console.log(`Version: ${packageJson.version || '1.0.0'}`);
        console.log(`Platform: ${os.platform()} ${os.arch()}`);
        console.log(`Node.js: ${process.version}`);
        console.log(`Home: ${__dirname}`);
        console.log('\n🔗 Links:');
        console.log('  GitHub: https://github.com/your-username/keep-it-moving');
        console.log('  Docs: https://kim-docs.example.com');
        console.log('\n💡 Commands:');
        console.log('  kim start    - Start the server');
        console.log('  kim dev      - Development mode');
        console.log('  kim test     - Run tests');
        console.log('  kim doctor   - Health check');
    });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    console.log(kimLogo);
    program.outputHelp();
}