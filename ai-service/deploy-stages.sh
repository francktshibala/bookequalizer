#!/bin/bash

# BookEqualizer AI Service - Incremental Deployment Script
# Deploys AI service in stages to avoid Railway dependency issues

set -e

echo "🚀 BookEqualizer AI Service - Incremental Deployment"
echo "=================================================="

# Check if we're in the right directory
if [[ ! -f "main-stage1.py" ]]; then
    echo "❌ Error: Please run this script from the ai-service directory"
    exit 1
fi

# Function to deploy a specific stage
deploy_stage() {
    local stage=$1
    local main_file=$2
    local requirements_file=$3
    
    echo ""
    echo "🔄 Deploying Stage $stage..."
    echo "Main file: $main_file"
    echo "Requirements: $requirements_file"
    
    # Backup current files
    cp main.py main-backup.py 2>/dev/null || true
    cp requirements.txt requirements-backup.txt 2>/dev/null || true
    
    # Copy stage files
    cp "$main_file" main.py
    cp "$requirements_file" requirements.txt
    
    echo "📦 Files prepared for Stage $stage"
    echo "   main.py -> $main_file"
    echo "   requirements.txt -> $requirements_file"
    
    # Deploy to Railway
    echo "🚂 Deploying to Railway..."
    railway up --detach
    
    echo "✅ Stage $stage deployed!"
    echo "🌐 Check deployment: railway status"
    echo "📊 View logs: railway logs"
    
    # Wait for user confirmation before next stage
    if [[ $stage != "3" ]]; then
        echo ""
        echo "⏳ Please test the deployment and confirm it's working before proceeding."
        echo "   Test URL: railway domain"
        echo "   Health check: curl \$(railway domain)/health"
        echo ""
        read -p "Press Enter to continue to next stage (or Ctrl+C to stop)..."
    fi
}

# Main deployment flow
echo ""
echo "This script will deploy the AI service in 3 stages:"
echo "  Stage 1: Basic FastAPI + EPUB validation"
echo "  Stage 2: Full EPUB processing + Text processing + Q&A"
echo "  Stage 3: Vector embeddings + Full ML features"
echo ""
echo "Each stage will be deployed and tested before proceeding."
echo ""
read -p "Continue with Stage 1 deployment? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Stage 1: Basic functionality
    deploy_stage "1" "main-stage1.py" "requirements-stage1.txt"
    
    # Stage 2: Full processing (if main-stage2.py exists)
    if [[ -f "main-stage2.py" ]]; then
        deploy_stage "2" "main-stage2.py" "requirements-stage2.txt"
    else
        echo "⚠️  Stage 2 files not found. Skipping to Stage 3."
    fi
    
    # Stage 3: Full ML features
    if [[ -f "main-full.py" ]]; then
        deploy_stage "3" "main-full.py" "requirements-full.txt"
    else
        echo "⚠️  Stage 3 files not found."
        echo "📝 To deploy full features, use main-full.py with requirements-full.txt"
    fi
    
    echo ""
    echo "🎉 Deployment complete!"
    echo "   Final service URL: railway domain"
    echo "   API docs: \$(railway domain)/docs"
    echo "   Health check: \$(railway domain)/health"
    
else
    echo "Deployment cancelled."
fi

echo ""
echo "🔧 Manual deployment commands:"
echo "   railway up                 # Deploy current files"
echo "   railway logs               # View logs"
echo "   railway status             # Check status"
echo "   railway domain             # Get service URL"