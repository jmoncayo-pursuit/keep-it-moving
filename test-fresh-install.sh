#!/bin/bash

# Test KIM Extension with Fresh VS Code Instance
# This script creates a clean VS Code profile and tests the extension

echo "🧪 Testing KIM Extension with Fresh VS Code Instance"
echo "=================================================="

# Create a temporary directory for the test profile
TEST_PROFILE_DIR="/tmp/kim-test-profile-$(date +%s)"
echo "📁 Creating test profile directory: $TEST_PROFILE_DIR"
mkdir -p "$TEST_PROFILE_DIR"

# Package the extension first
echo "📦 Packaging extension..."
cd extension
npm run package
if [ $? -ne 0 ]; then
    echo "❌ Failed to package extension"
    exit 1
fi

# Get the extension file path
EXTENSION_FILE="$(pwd)/kim-vscode-extension-1.0.0.vsix"
echo "📄 Extension file: $EXTENSION_FILE"

# Go back to root
cd ..

echo "🚀 Starting fresh VS Code instance..."
echo "   - Clean profile: $TEST_PROFILE_DIR"
echo "   - Root folder: $(pwd)"
echo "   - Extension: $EXTENSION_FILE"
echo ""

# Start VS Code with clean profile and install extension
code \
    --user-data-dir "$TEST_PROFILE_DIR" \
    --extensions-dir "$TEST_PROFILE_DIR/extensions" \
    --install-extension "$EXTENSION_FILE" \
    --new-window \
    "$(pwd)" \
    --wait

echo ""
echo "✅ VS Code session completed"
echo "🧹 Cleaning up test profile..."
rm -rf "$TEST_PROFILE_DIR"
echo "✨ Test complete!"