// Simple HTTP server to serve PWA static files
const http = require('http');
const fs = require('fs');
const path = require('path');

class PWAServer {
    constructor(port = 3000) {
        this.port = port;
        this.server = null;
        this.startTime = null;
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
    }

    start() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            this.startTime = new Date();
            this.log(`🌐 PWA Server running on http://0.0.0.0:${this.port}`);

            // Show local IP addresses
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();
            const localIPs = [];

            Object.keys(networkInterfaces).forEach(interfaceName => {
                networkInterfaces[interfaceName].forEach(iface => {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        localIPs.push(iface.address);
                    }
                });
            });

            if (localIPs.length > 0) {
                this.log(`📱 PWA accessible from mobile devices:`);
                localIPs.forEach(ip => {
                    this.log(`   http://${ip}:${this.port}`);
                });
            }
        });

        this.server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                const portQuips = [
                    `⚠️ Port ${this.port} is having a party! Trying ${this.port + 1}...`,
                    `🚪 Port ${this.port} is occupied! Knocking on ${this.port + 1}...`,
                    `🏠 Port ${this.port} is busy! Moving to ${this.port + 1}...`
                ];
                const randomQuip = portQuips[Math.floor(Math.random() * portQuips.length)];
                this.log(randomQuip);
                this.port++;
                this.start();
            } else {
                this.log('❌ PWA Server error: ' + error.message);
            }
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
            this.log('🛑 PWA Server stopped');
        }
    }

    handleRequest(req, res) {
        // Add CORS headers for development
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // Handle API endpoints
        if (req.url === '/api/status') {
            this.serveStatusAPI(res);
            return;
        }

        const url = req.url === '/' ? '/index.html' : req.url;
        const pwaDistPath = path.join(__dirname, '..', 'pwa', 'dist');
        const filePath = path.join(pwaDistPath, url);

        // Security check
        if (!filePath.startsWith(pwaDistPath)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Access denied');
            return;
        }

        // Check if PWA is built
        if (!fs.existsSync(pwaDistPath)) {
            this.serveSetupPage(res);
            return;
        }

        // Serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                if (url === '/index.html' || url === '/') {
                    // Try to serve index.html for SPA routing
                    const indexPath = path.join(pwaDistPath, 'index.html');
                    fs.readFile(indexPath, (indexErr, indexData) => {
                        if (indexErr) {
                            this.serveSetupPage(res);
                        } else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(indexData);
                        }
                    });
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('File not found');
                }
                return;
            }

            // Set content type
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.mjs': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/ttf',
                '.webp': 'image/webp',
                '.webmanifest': 'application/manifest+json'
            };

            const contentType = contentTypes[ext] || 'text/plain';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    }

    serveStatusAPI(res) {
        const os = require('os');
        const networkInterfaces = os.networkInterfaces();
        const localIPs = [];

        Object.keys(networkInterfaces).forEach(interfaceName => {
            networkInterfaces[interfaceName].forEach(iface => {
                if (iface.family === 'IPv4' && !iface.internal) {
                    localIPs.push(iface.address);
                }
            });
        });

        const status = {
            status: 'running',
            port: this.port,
            urls: localIPs.map(ip => `http://${ip}:${this.port}`),
            timestamp: new Date().toISOString(),
            emoji: '🚀',
            message: 'PWA Server is ready to rock!'
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    }

    serveSetupPage(res) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KIM Setup Required</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 500px;
            padding: 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .emoji { font-size: 4em; margin-bottom: 20px; }
        h1 { margin: 0 0 20px 0; font-size: 2em; }
        .status { 
            background: rgba(16, 185, 129, 0.2); 
            padding: 15px; 
            border-radius: 10px; 
            margin: 20px 0;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .instructions {
            background: rgba(59, 130, 246, 0.2);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .code {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 5px;
            font-family: 'Monaco', 'Menlo', monospace;
            margin: 10px 0;
            font-size: 0.9em;
        }
        .refresh-btn {
            background: rgba(16, 185, 129, 0.8);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            margin-top: 20px;
            transition: background 0.3s;
        }
        .refresh-btn:hover {
            background: rgba(16, 185, 129, 1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🚀</div>
        <h1>KIM PWA Setup</h1>
        <p style="opacity: 0.9; margin-bottom: 20px;">Keep-It-Moving is almost ready to rock! 🎸</p>
        
        <div class="status">
            ✅ PWA Server is running<br>
            📱 Ready to serve your app<br>
            🎯 Just needs a quick build first!
        </div>
        
        <div class="instructions">
            <h3>🔧 Build the PWA first:</h3>
            <div class="code">cd pwa && npm run build</div>
            
            <h3>📱 Or run in development mode:</h3>
            <div class="code">cd pwa && npm run dev</div>
            <p><small>Development mode runs on port 3000</small></p>
        </div>
        
        <button class="refresh-btn" onclick="location.reload()">
            🔄 Refresh Page
        </button>
        
        <p style="margin-top: 30px; opacity: 0.8; font-size: 0.9em;">
            🎯 This server will automatically serve your PWA once it's built
        </p>
    </div>
    
    <script>
        // Auto-refresh every 10 seconds to check if PWA is built
        setTimeout(() => location.reload(), 10000);
    </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
}

module.exports = PWAServer;