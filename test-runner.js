#!/usr/bin/env node

// KIM Test Runner
// Comprehensive test suite runner for all components 🧪

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 KIM Test Suite Runner');
console.log('========================\n');

const testSuites = [
    {
        name: 'Server Tests',
        command: 'npm',
        args: ['test'],
        cwd: path.join(__dirname, 'server'),
        emoji: '🖥️'
    },
    {
        name: 'PWA Tests',
        command: 'npm',
        args: ['test', '--', '--watchAll=false', '--coverage'],
        cwd: path.join(__dirname, 'pwa'),
        emoji: '📱'
    },
    {
        name: 'Extension Tests',
        command: 'npm',
        args: ['test'],
        cwd: path.join(__dirname, 'extension'),
        emoji: '🔧'
    }
];

async function runTest(suite) {
    return new Promise((resolve) => {
        console.log(`${suite.emoji} Running ${suite.name}...`);

        const startTime = Date.now();
        const process = spawn(suite.command, suite.args, {
            cwd: suite.cwd,
            stdio: 'pipe'
        });

        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
            output += data.toString();
        });

        process.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        process.on('close', (code) => {
            const duration = Date.now() - startTime;
            const success = code === 0;

            console.log(`${success ? '✅' : '❌'} ${suite.name} ${success ? 'PASSED' : 'FAILED'} (${duration}ms)`);

            if (!success) {
                console.log(`\n📋 ${suite.name} Output:`);
                console.log(output);
                if (errorOutput) {
                    console.log(`\n🐛 ${suite.name} Errors:`);
                    console.log(errorOutput);
                }
            }

            resolve({
                name: suite.name,
                success,
                duration,
                output,
                errorOutput
            });
        });
    });
}

async function runAllTests() {
    const results = [];
    const startTime = Date.now();

    for (const suite of testSuites) {
        const result = await runTest(suite);
        results.push(result);
        console.log(''); // Add spacing
    }

    const totalDuration = Date.now() - startTime;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = results.filter(r => r.success === false).length;

    console.log('📊 Test Summary');
    console.log('===============');
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / results.length) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
        console.log('\n🐛 Failed Tests:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.name}`);
        });
    }

    console.log('\n🎉 Test run complete!');

    // Exit with error code if any tests failed
    process.exit(failedTests > 0 ? 1 : 0);
}

// Performance benchmarks
async function runPerformanceBenchmarks() {
    console.log('⚡ Performance Benchmarks');
    console.log('========================\n');

    const benchmarks = [
        {
            name: 'Connection Time',
            target: '< 2 seconds',
            test: async () => {
                const WebSocket = require('ws');
                const startTime = Date.now();

                return new Promise((resolve) => {
                    const ws = new WebSocket('ws://localhost:8080');
                    ws.on('open', () => {
                        const duration = Date.now() - startTime;
                        ws.close();
                        resolve(duration);
                    });
                    ws.on('error', () => resolve(null));
                });
            }
        }
    ];

    for (const benchmark of benchmarks) {
        try {
            const result = await benchmark.test();
            if (result !== null) {
                console.log(`✅ ${benchmark.name}: ${result}ms (${benchmark.target})`);
            } else {
                console.log(`⚠️  ${benchmark.name}: Could not connect to server`);
            }
        } catch (error) {
            console.log(`❌ ${benchmark.name}: Error - ${error.message}`);
        }
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--performance')) {
        runPerformanceBenchmarks();
    } else {
        runAllTests();
    }
}

module.exports = { runAllTests, runPerformanceBenchmarks };