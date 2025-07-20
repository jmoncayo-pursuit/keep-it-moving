// Keep-It-Moving (KIM) Server Tests
// Unit tests for WebSocket server functionality 🧪

const KIMRelayServer = require('../index');
const WebSocket = require('ws');

describe('KIM Relay Server', () => {
    let server;
    let testPort = 8081;

    beforeEach(() => {
        server = new KIMRelayServer(testPort);
    });

    afterEach(() => {
        if (server) {
            server.stop();
        }
    });

    test('should start server on specified port', () => {
        server.start();
        expect(server.port).toBe(testPort);
        expect(server.wss).toBeDefined();
    });

    test('should generate valid pairing codes with device type', () => {
        const session = server.generatePairingCode('phone');

        expect(session.code).toMatch(/^\d{6}$/); // 6-digit code
        expect(session.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); // UUID v4
        expect(session.deviceType).toBe('phone');
        expect(session.isActive).toBe(true);
        expect(session.expires).toBeGreaterThan(Date.now());
        expect(server.pairingSessions.has(session.code)).toBe(true);
    });

    test('should validate tokens correctly with session management', () => {
        const session = server.generatePairingCode('tablet');

        // Token should not be valid until pairing is complete
        expect(server.validateToken(session.token)).toBe(false);

        // Mock a paired client with token session
        server.clients.set(session.token, { mock: 'client' });
        server.storeTokenSession(session.token, { deviceType: 'tablet' });

        expect(server.validateToken(session.token)).toBe(true);

        // Check that last activity is updated on validation
        const tokenSession = server.tokenSessions.get(session.token);
        const initialActivity = tokenSession.lastActivity;

        // Validate again to update last activity
        server.validateToken(session.token);
        const updatedSession = server.tokenSessions.get(session.token);
        expect(updatedSession.lastActivity).toBeGreaterThanOrEqual(initialActivity);
    });

    test('should handle message parsing errors gracefully', () => {
        const mockWs = {
            send: jest.fn()
        };

        // This should trigger error handling
        server.handleMessage(mockWs, { type: 'invalid' });

        // Should send error response
        expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('"type":"error"')
        );
    });

    test('should expire pairing sessions and clean up', () => {
        const session = server.generatePairingCode('laptop');

        // Manually expire the session
        const storedSession = server.pairingSessions.get(session.code);
        storedSession.expires = Date.now() - 1000; // 1 second ago

        const mockWs = {
            send: jest.fn()
        };

        server.handlePairing(mockWs, session.code);

        // Should send error for expired code
        expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('"emoji":"⏰"')
        );

        // Session should be cleaned up
        expect(server.pairingSessions.has(session.code)).toBe(false);
    });

    test('should validate pairing codes correctly', () => {
        const session = server.generatePairingCode('phone');

        // Valid code
        const validResult = server.validatePairingCode(session.code);
        expect(validResult.valid).toBe(true);
        expect(validResult.session).toBeDefined();
        expect(validResult.session.deviceType).toBe('phone');

        // Invalid code
        const invalidResult = server.validatePairingCode('999999');
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.reason).toBe('Code not found');
        expect(invalidResult.emoji).toBe('🔍');

        // Mark session as used and test again
        validResult.session.isActive = false;
        const usedResult = server.validatePairingCode(session.code);
        expect(usedResult.valid).toBe(false);
        expect(usedResult.reason).toBe('Code already used');
        expect(usedResult.emoji).toBe('🔒');
    });

    test('should get active pairing sessions', () => {
        const session1 = server.generatePairingCode('phone');
        const session2 = server.generatePairingCode('tablet');

        // Add an expired session
        server.pairingSessions.set('999999', {
            code: '999999',
            token: 'expired-token',
            expires: Date.now() - 1000,
            isActive: true,
            deviceType: 'expired'
        });

        const activeSessions = server.getActivePairingSessions();

        expect(activeSessions).toHaveLength(2);
        expect(activeSessions.find(s => s.code === session1.code)).toBeDefined();
        expect(activeSessions.find(s => s.code === session2.code)).toBeDefined();

        // Expired session should be cleaned up
        expect(server.pairingSessions.has('999999')).toBe(false);
    });

    test('should store and manage token sessions', () => {
        const token = 'test-token-123';
        const deviceInfo = { userAgent: 'Test Browser', screenSize: '1920x1080' };

        server.storeTokenSession(token, deviceInfo);

        expect(server.tokenSessions.has(token)).toBe(true);

        const session = server.tokenSessions.get(token);
        expect(session.token).toBe(token);
        expect(session.deviceInfo).toEqual(deviceInfo);
        expect(session.expiresAt).toBeGreaterThan(Date.now());
        expect(session.expiresAt).toBeLessThanOrEqual(Date.now() + (24 * 60 * 60 * 1000));
    });

    test('should clean up expired tokens', () => {
        server.tokenSessions = new Map();

        const expiredToken = 'expired-token';
        const validToken = 'valid-token';

        // Add expired token
        server.tokenSessions.set(expiredToken, {
            token: expiredToken,
            expiresAt: Date.now() - 1000,
            createdAt: Date.now() - 2000
        });

        // Add valid token
        server.tokenSessions.set(validToken, {
            token: validToken,
            expiresAt: Date.now() + 10000,
            createdAt: Date.now()
        });

        server.clients.set(expiredToken, {});
        server.clients.set(validToken, {});

        server.cleanupExpiredTokens();

        expect(server.tokenSessions.has(expiredToken)).toBe(false);
        expect(server.tokenSessions.has(validToken)).toBe(true);
        expect(server.clients.has(expiredToken)).toBe(false);
        expect(server.clients.has(validToken)).toBe(true);
    });
});

// Integration test placeholder
describe('KIM Server Integration', () => {
    test('should handle WebSocket connections', (done) => {
        const server = new KIMRelayServer(8082);
        server.start();

        const client = new WebSocket('ws://localhost:8082');

        client.on('open', () => {
            // Send ping message
            client.send(JSON.stringify({ type: 'ping' }));
        });

        client.on('message', (data) => {
            const response = JSON.parse(data.toString());
            expect(response.type).toBe('pong');
            expect(response.emoji).toBe('💓');

            client.close();
            server.stop();
            done();
        });
    });

    test('should handle multiple concurrent connections', (done) => {
        const server = new KIMRelayServer(8083);
        server.start();

        const clients = [];
        let connectedCount = 0;
        const totalClients = 5;

        for (let i = 0; i < totalClients; i++) {
            const client = new WebSocket('ws://localhost:8083');
            clients.push(client);

            client.on('open', () => {
                connectedCount++;
                if (connectedCount === totalClients) {
                    // All clients connected successfully
                    expect(connectedCount).toBe(totalClients);

                    // Clean up
                    clients.forEach(c => c.close());
                    server.stop();
                    done();
                }
            });
        }
    });

    test('should maintain 95% success rate under load', (done) => {
        const server = new KIMRelayServer(8084);
        server.start();

        const client = new WebSocket('ws://localhost:8084');
        let responseCount = 0;
        const messageCount = 50;

        client.on('open', () => {
            // Send multiple ping messages rapidly
            for (let i = 0; i < messageCount; i++) {
                client.send(JSON.stringify({
                    type: 'ping',
                    id: i,
                    timestamp: Date.now()
                }));
            }
        });

        let testCompleted = false;

        client.on('message', (data) => {
            const response = JSON.parse(data.toString());
            if (response.type === 'pong') {
                responseCount++;

                if (responseCount >= messageCount * 0.95 && !testCompleted) { // 95% success rate
                    testCompleted = true;
                    expect(responseCount).toBeGreaterThanOrEqual(messageCount * 0.95);
                    client.close();
                    server.stop();
                    done();
                }
            }
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            if (responseCount < messageCount * 0.95 && !testCompleted) {
                testCompleted = true;
                client.close();
                server.stop();
                done.fail(`Only received ${responseCount}/${messageCount} responses (${(responseCount / messageCount * 100).toFixed(1)}%)`);
            }
        }, 5000);
    });

    test('should respond within 2 seconds', (done) => {
        const server = new KIMRelayServer(8085);
        server.start();

        const client = new WebSocket('ws://localhost:8085');
        const startTime = Date.now();

        client.on('open', () => {
            client.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
        });

        client.on('message', (data) => {
            const response = JSON.parse(data.toString());
            if (response.type === 'pong') {
                const responseTime = Date.now() - startTime;
                expect(responseTime).toBeLessThan(2000); // 2 seconds

                client.close();
                server.stop();
                done();
            }
        });
    });
});