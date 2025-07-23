#!/usr/bin/env node

// Check network configuration for KIM
const os = require('os');

console.log('🌐 Checking Network Configuration for KIM...\n');

// Get network interfaces (same logic as extension)
const networkInterfaces = os.networkInterfaces();
const ipAddresses = [];

Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];

    interfaces.forEach(iface => {
        // Skip internal and non-IPv4 addresses
        if (!iface.internal && iface.family === 'IPv4') {
            ipAddresses.push(iface.address);
        }
    });
});

console.log('📡 Available Network Interfaces:');
Object.keys(networkInterfaces).forEach(interfaceName => {
    console.log(`\n   ${interfaceName}:`);
    networkInterfaces[interfaceName].forEach(iface => {
        const status = iface.internal ? '(internal)' : '(external)';
        const family = iface.family;
        console.log(`     ${iface.address} ${family} ${status}`);
    });
});

console.log('\n🎯 IP Addresses KIM Extension Will Use:');
if (ipAddresses.length > 0) {
    ipAddresses.forEach((ip, index) => {
        console.log(`   ${index + 1}. ${ip} ${index === 0 ? '← Primary (used by extension)' : ''}`);
    });

    const primaryIp = ipAddresses[0];
    console.log(`\n📱 Your QR code should point to: http://${primaryIp}:3000?code=XXXXXX`);
    console.log(`\n🔧 To test manually on your phone:`);
    console.log(`   1. Make sure PWA is running: cd pwa && npm run dev`);
    console.log(`   2. Open this URL on your phone: http://${primaryIp}:3000`);
    console.log(`   3. If that works, the QR code should work too`);

} else {
    console.log('   ❌ No external IP addresses found!');
    console.log('   🔧 This means:');
    console.log('     - Your computer might not be connected to WiFi/network');
    console.log('     - Or network interfaces are not detected properly');
    console.log('     - Extension will fall back to localhost (won\'t work on phone)');
}

console.log('\n🔍 Troubleshooting Steps:');
console.log('   1. Ensure your computer is connected to WiFi');
console.log('   2. Ensure your phone is on the same WiFi network');
console.log('   3. Check if your router allows device-to-device communication');
console.log('   4. Try disabling any VPN or firewall temporarily');
console.log('   5. Test the PWA URL manually in phone browser first');