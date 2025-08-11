#!/bin/bash

# Start KIM Extension in Development Mode
# Runs directly from source - no packaging/installing needed

echo "🚀 Starting KIM Extension in Development Mode"
echo "============================================="
echo "📁 Extension folder: $(pwd)/extension"
echo "🔧 Running from source code (no packaging needed)"
echo ""

cd extension

# Ensure extension dependencies are installed (ws, qrcode, uuid, etc.)
if ! npm ls ws qrcode uuid --depth=0 >/dev/null 2>&1; then
  echo "📦 Installing extension dependencies..."
  npm ci --silent || npm install --silent
fi

code --extensionDevelopmentPath=$(pwd) --new-window ../

echo "✅ VS Code opened with KIM extension in development mode"
echo "💡 The extension runs directly from your source code"
echo "🔄 Make changes and reload (Ctrl+R) to see updates"