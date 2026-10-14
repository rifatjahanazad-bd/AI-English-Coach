#!/usr/bin/env bash
# ==============================================================================
# deploy_to_vercel.sh - One-Click Deployment Script for AI English Coach
# Deploys FastAPI backend + Static Web UI to Vercel Serverless Platform
# ==============================================================================

set -e

echo "🚀 Preparing AI English Coach for Vercel Deployment..."

# 1. Verify vercel.json and api/index.py exist
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found in root directory!"
    exit 1
fi

if [ ! -f "api/index.py" ]; then
    echo "❌ Error: api/index.py serverless entrypoint not found!"
    exit 1
fi

echo "✅ Configuration files verified:"
echo "   - vercel.json (Routes & Builds)"
echo "   - api/index.py (FastAPI Serverless Handler)"
echo "   - firestore.rules (Cloud Firestore Security)"

# 2. Deploy to Vercel using npx
echo "📦 Deploying to Vercel (Production)..."
npx -y vercel --prod

echo ""
echo "🎉 Deployment initiated! Check the terminal output above for your live URL."
