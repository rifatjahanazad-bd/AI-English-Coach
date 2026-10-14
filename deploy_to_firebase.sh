#!/usr/bin/env bash
# ==============================================================================
# AI English Coach: Deployment Script to Google Cloud Run & Firebase Hosting
# ==============================================================================
set -e

PROJECT_ID="gen-lang-client-0920536743"
REGION="us-central1"
SERVICE_NAME="ai-english-coach"

echo "================================================================"
echo "🚀 Deploying AI English Coach to Google Cloud Run & Firebase"
echo "Project: $PROJECT_ID | Region: $REGION | Service: $SERVICE_NAME"
echo "================================================================"

# Step 1: Build and Deploy the Container to Google Cloud Run
echo "📦 Step 1: Building and deploying container to Google Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars ENV=production

# Step 2: Deploy Firebase Hosting (CDN + Rewrites to Cloud Run)
echo "🌐 Step 2: Deploying Firebase Hosting with Cloud Run integration..."
npx -y firebase-tools@latest deploy --only hosting

echo "================================================================"
echo "✅ Deployment complete! Your live application is accessible via:"
echo "   Firebase Hosting: https://${PROJECT_ID}.web.app"
echo "================================================================"
