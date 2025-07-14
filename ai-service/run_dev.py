#!/usr/bin/env python3
"""
Development runner for BookEqualizer AI Service
"""

import subprocess
import sys
import os

def check_dependencies():
    """Check if required packages are installed"""
    try:
        import fastapi
        import uvicorn
        print("✅ Core dependencies available")
        return True
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("Run: pip install fastapi uvicorn")
        return False

def run_service():
    """Run the AI service in development mode"""
    if not check_dependencies():
        return
    
    print("🚀 Starting BookEqualizer AI Service...")
    print("📡 Service will be available at: http://localhost:8001")
    print("📚 API docs at: http://localhost:8001/docs")
    
    try:
        # Change to ai-service directory
        os.chdir('/home/franc/bookequalizer/ai-service')
        
        # Run uvicorn
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "main:app",
            "--host", "0.0.0.0",
            "--port", "8001",
            "--reload",
            "--log-level", "info"
        ])
    except KeyboardInterrupt:
        print("\n🛑 AI Service stopped")
    except Exception as e:
        print(f"❌ Failed to start service: {e}")

if __name__ == "__main__":
    run_service()