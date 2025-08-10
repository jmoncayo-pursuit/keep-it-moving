#!/bin/bash

# Start KIM Extension in Development Mode
# Runs directly from source - no packaging/installing needed

echo "🚀 Starting KIM Extension in Development Mode"
echo "============================================="
echo "📁 Extension folder: $(pwd)/extension"
echo "🔧 Running from source code (no packaging needed)"
echo ""

cd extension
code --extensionDevelopmentPath=$(pwd) --new-window ../

echo "✅ VS Code opened with KIM extension in development mode"
echo "💡 The extension runs directly from your source code"
echo "🔄 Make changes and reload (Ctrl+R) to see updates"