#!/usr/bin/env python3
"""
BookEqualizer AI Service - Ultra-minimal deployment test
"""

import json
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

class HealthHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            
            response = {
                "status": "healthy",
                "service": "BookEqualizer AI Service",
                "version": "1.0.0-minimal",
                "timestamp": datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        elif self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            
            response = {
                "message": "BookEqualizer AI Service - Minimal",
                "status": "running",
                "version": "1.0.0-minimal"
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def do_POST(self):
        if self.path == '/process-epub':
            # Read the content length
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                # Read and discard the body for now
                self.rfile.read(content_length)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            
            response = {
                "success": True,
                "book_id": "demo_book_123",
                "title": "Demo Book",
                "author": "Demo Author", 
                "chapters": [
                    {
                        "id": "chapter_1",
                        "title": "Chapter 1",
                        "index": 0,
                        "content": "This is demo content from the minimal AI service",
                        "segments": [],
                        "word_count": 100,
                        "character_count": 500
                    }
                ],
                "total_segments": 1,
                "processing_time": 0.1,
                "note": "Minimal version - demo response"
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    server = HTTPServer(('0.0.0.0', port), HealthHandler)
    print(f"Server starting on port {port}")
    server.serve_forever()