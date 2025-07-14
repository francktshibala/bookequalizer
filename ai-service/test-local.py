#!/usr/bin/env python3
"""
Quick local test of AI service functionality
"""

import requests
import json

# Test data
test_epub_data = b"PK\x03\x04" + b"0" * 1000  # Mock EPUB header + content

def test_local_service():
    """Test the AI service locally"""
    base_url = "http://localhost:8001"
    
    print("🧪 Testing AI Service Locally...")
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health check: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return
    
    # Test 2: EPUB processing
    try:
        files = {'file': ('test.epub', test_epub_data, 'application/epub+zip')}
        response = requests.post(f"{base_url}/process-epub", files=files, timeout=10)
        print(f"✅ EPUB processing: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   Book ID: {result.get('book_id')}")
            print(f"   Title: {result.get('title')}")
    except Exception as e:
        print(f"❌ EPUB processing failed: {e}")
    
    # Test 3: Text processing
    try:
        data = {
            "text": "This is a test sentence. This is another test sentence.",
            "tts_provider": "google"
        }
        response = requests.post(f"{base_url}/process-text", json=data, timeout=10)
        print(f"✅ Text processing: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   Segments: {len(result.get('segments', []))}")
    except Exception as e:
        print(f"❌ Text processing failed: {e}")
    
    print("\n🎉 Local testing complete!")

if __name__ == "__main__":
    test_local_service()