#!/bin/bash
# Tunnel script for STRADEX demo
# Usage: bash tunnel.sh

echo "=== STRADEX Demo Tunnel ==="
echo ""

# Check if backend is running
if ! curl -s http://localhost:3102/api/v1/health > /dev/null 2>&1; then
  echo "Backend not running. Starting..."
  cd "$(dirname "$0")/backend"
  nohup node dist/main.js > /tmp/stradex-backend.log 2>&1 &
  echo "Waiting for backend..."
  sleep 4
fi

echo "Backend is running on http://localhost:3102"
echo "Opening tunnel..."

# Try localtunnel
npx localtunnel --port 3102 --subdomain stradex-demo
