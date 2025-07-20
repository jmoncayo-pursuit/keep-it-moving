// KIM Pairing Code Generator
const WebSocket = require('ws');

async function generatePairingCode(port = 8080) {
    return new Promise((resolve, reject) => {
        console.log(`🔗 Connecting to KIM server on port ${port}...`);

        const ws = new WebSocket(`ws://localhost:${port}`);

        ws.on('open', () => {
            console.log('🔌 Connected to KIM server');

            // Request a pairing code
            ws.send(JSON.stringify({
                type: 'generate_pairing_code',
                deviceType: 'cli'
            }));
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📩 Received message:', JSON.stringify(message, null, 2));

                if (message.type === 'pairing_code_generated') {
                    const code = message.data?.code;
                    if (code) {
                        console.log(`\n🔢 Your pairing code: ${code}`);
                        console.log(`\n📱 Open http://localhost:3000 in your browser and enter this code to pair your device`);
                        console.log(`\n⏱️ This code will expire in 5 minutes`);

                        // Close the connection after getting the code
                        ws.close();
                        resolve(code);
                    }
                }
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        });

        ws.on('error', (error) => {
            console.error(`❌ Connection error: ${error.message}`);
            console.error('Make sure the KIM server is running (use "kim start" first)');
            reject(error);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                console.error('❌ Connection timeout');
                console.error('Make sure the KIM server is running (use "kim start" first)');
                ws.close();
                reject(new Error('Connection timeout'));
            }
        }, 5000);
    });
}

module.exports = { generatePairingCode };