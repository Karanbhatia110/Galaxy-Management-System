#!/usr/bin/env bash
# build.sh — Render build script
# Builds the React frontend, copies output to backend/static, then installs Python deps

set -e

echo "=== Building Frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Copying frontend build to backend/static ==="
rm -rf backend/static
cp -r frontend/dist backend/static

echo "=== Installing Python dependencies ==="
cd backend
pip install -r requirements.txt

echo "=== Build complete ==="
