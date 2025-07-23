#!/usr/bin/env node

// Test dynamic port assignment
const net = require('net');

console.log('🧪 Testing Dynamic Port Assignment...\n');

// Function to check if port is available (same as extension)
async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.listen(port, '0.0.0.0', () => {
            server.close(() => resolve(true));
        });

        server.on('error', () => resolve(false));
    });
}

// Function to find available port (same as extension)
async function findAvailablePort(startPort = 8080) {
    const portRanges = [
        // Preferred range around default
        Array.from({ length: 10 }, (_, i) => startPort + i),
        // Common development ports
        [3001, 3002, 3003, 4000, 4001, 5000, 5001],
        // Higher range if all else fails
        Array.from({ length: 20 }, (_, i) => 8100 + i)
    ].flat();

    console.log('🔍 Checking ports:', portRanges.slice(0, 15).join(', '), '...');

    for (const port of portRanges) {
        if (await isPortAvailable(port)) {
            console.log(`✅ Found available port: ${port}`);
            return port;
        } else {
            console.log(`❌ Port ${port} is busy`);
        }
    }

    // If all predefined ports are taken, find any available port
    return await findRandomAvailablePort();
}

// Function to find random available port
async function findRandomAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.listen(0, '0.0.0.0', () => {
            const port = server.address().port;
            server.close(() => {
                console.log(`🎲 System assigned port: ${port}`);
                resolve(port);
            });
        });

        server.on('error', reject);
    });
}

// Test the port finding
(async () => {
    try {
        console.log('🎯 Testing with default port 8080...');
        const port1 = await findAvailablePort(8080);

        console.log('\n🎯 Testing with busy port 80...');
        const port2 = await findAvailablePort(80);

        console.log('\n🎯 Testing with high port 9000...');
        const port3 = await findAvailablePort(9000);

        console.log('\n🎉 Dynamic port assignment test completed!');
        console.log(`   Default (8080) → ${port1}`);
        console.log(`   Restricted (80) → ${port2}`);
        console.log(`   High (9000) → ${port3}`);

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
})();