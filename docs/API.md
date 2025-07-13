# BookEqualizer API Documentation

> RESTful API for AI Reading & Audio Learning Companion

## 🎯 API Overview

**Base URL**: `http://localhost:3001/api` (development)  
**Authentication**: Clerk JWT tokens  
**Content-Type**: `application/json`  
**Rate Limiting**: 60 req/min (public), 300 req/min (authenticated)  

## 📚 Books Management

### Upload EPUB
Upload and process EPUB files for reading and audio generation.

```http
POST /api/books/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

{
  "file": <epub_file>,
  "generateAudio": true,
  "audioPreferences": {
    "voice": "en-US-Neural2-D",
    "speed": 1.0,
    "quality": "high"
  }
}
```

**Response:**
```json
{
  "id": "book_123",
  "title": "Pride and Prejudice",
  "author": "Jane Austen", 
  "status": "processing",
  "audioGeneration": {
    "status": "queued",
    "estimatedTime": 180
  },
  "uploadedAt": "2024-01-15T10:30:00Z"
}
```

### Get Book Details
Retrieve book metadata and processing status.

```http
GET /api/books/:id
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "book_123",
  "title": "Pride and Prejudice",
  "author": "Jane Austen",
  "chapters": [
    {
      "id": "chapter_1",
      "title": "Chapter 1",
      "textLength": 2847,
      "audioFile": "/audio/book_123/chapter_1.mp3",
      "duration": 420
    }
  ],
  "totalDuration": 18000,
  "processingStatus": "completed",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### List User Books
Get all books for authenticated user.

```http
GET /api/books
Authorization: Bearer <jwt_token>
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20)
  - status: string (processing|completed|error)
```

## 🎵 Audio Management

### Generate Audio
Create TTS audio for specific book chapter.

```http
POST /api/books/:id/audio/generate
Authorization: Bearer <jwt_token>

{
  "chapterId": "chapter_1",
  "voice": "en-US-Neural2-D",
  "speed": 1.0,
  "quality": "high"
}
```

**Response:**
```json
{
  "jobId": "audio_job_456",
  "status": "processing",
  "estimatedTime": 45,
  "chapterId": "chapter_1"
}
```

### Stream Audio
Stream audio file with caching headers.

```http
GET /api/books/:id/audio/stream/:chapterId
Authorization: Bearer <jwt_token>
Accept: audio/mpeg
Range: bytes=0-1023 (optional)
```

**Response:**
```
Status: 206 Partial Content
Content-Type: audio/mpeg
Content-Range: bytes 0-1023/2048576
Accept-Ranges: bytes
Cache-Control: public, max-age=31536000

<audio_binary_data>
```

### Get Audio Status
Check audio generation progress.

```http
GET /api/audio/jobs/:jobId
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "jobId": "audio_job_456",
  "status": "completed",
  "progress": 100,
  "audioFile": "/audio/book_123/chapter_1.mp3",
  "duration": 420,
  "completedAt": "2024-01-15T10:35:30Z"
}
```

## 👤 User Management

### Get User Profile
Retrieve user preferences and settings.

```http
GET /api/users/profile
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "id": "user_789",
  "preferences": {
    "audio": {
      "defaultVoice": "en-US-Neural2-D",
      "defaultSpeed": 1.0,
      "autoplay": false
    },
    "reading": {
      "fontSize": "medium",
      "theme": "light",
      "highlightColor": "#yellow"
    }
  },
  "subscription": {
    "plan": "free",
    "usage": {
      "booksProcessed": 5,
      "audioMinutes": 240
    }
  }
}
```

### Update Audio Preferences
Modify user's default audio settings.

```http
PUT /api/users/audio/preferences
Authorization: Bearer <jwt_token>

{
  "defaultVoice": "en-US-Neural2-F",
  "defaultSpeed": 1.2,
  "autoplay": true,
  "quality": "high"
}
```

## 📖 Reading Progress

### Get Reading Position
Retrieve current reading/listening position.

```http
GET /api/books/:id/progress
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "bookId": "book_123",
  "chapterId": "chapter_3",
  "position": {
    "text": {
      "characterOffset": 1247,
      "paragraph": 12
    },
    "audio": {
      "currentTime": 185.5,
      "duration": 420
    }
  },
  "mode": "audio",
  "lastUpdated": "2024-01-15T11:22:00Z"
}
```

### Update Reading Position
Save current reading/listening position.

```http
PUT /api/books/:id/progress
Authorization: Bearer <jwt_token>

{
  "chapterId": "chapter_3",
  "position": {
    "text": {
      "characterOffset": 1500,
      "paragraph": 15
    },
    "audio": {
      "currentTime": 220.0
    }
  },
  "mode": "audio"
}
```

## 🤖 AI Chat

### Ask Question
Get AI assistance about the book content.

```http
POST /api/books/:id/chat
Authorization: Bearer <jwt_token>

{
  "question": "What is the relationship between Elizabeth and Darcy?",
  "context": {
    "chapterId": "chapter_10",
    "position": 1500
  }
}
```

**Response:**
```json
{
  "id": "chat_msg_001",
  "question": "What is the relationship between Elizabeth and Darcy?",
  "answer": "Elizabeth Bennet and Mr. Darcy have a complex relationship that evolves throughout the novel...",
  "sources": [
    {
      "chapterId": "chapter_3",
      "text": "relevant quote from text",
      "confidence": 0.95
    }
  ],
  "timestamp": "2024-01-15T11:25:00Z"
}
```

### Get Chat History
Retrieve previous Q&A for a book.

```http
GET /api/books/:id/chat/history
Authorization: Bearer <jwt_token>
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 10)
```

## 🔧 System Endpoints

### Health Check
Verify API service status.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T11:30:00Z",
  "services": {
    "database": "connected",
    "tts": "operational",
    "ai": "operational",
    "storage": "operational"
  },
  "version": "1.0.0"
}
```

### Get Audio Voices
List available TTS voices.

```http
GET /api/audio/voices
```

**Response:**
```json
{
  "voices": [
    {
      "id": "en-US-Neural2-D",
      "name": "Male English (US)",
      "language": "en-US",
      "gender": "male",
      "premium": false
    },
    {
      "id": "en-US-Neural2-F", 
      "name": "Female English (US)",
      "language": "en-US",
      "gender": "female",
      "premium": false
    }
  ]
}
```

## 📊 Analytics

### Get Usage Stats
Retrieve user usage statistics.

```http
GET /api/users/stats
Authorization: Bearer <jwt_token>
Query Parameters:
  - period: string (day|week|month|year)
```

**Response:**
```json
{
  "period": "month",
  "reading": {
    "totalTime": 18000,
    "booksCompleted": 3,
    "averageSession": 1200
  },
  "audio": {
    "totalTime": 12000,
    "chaptersListened": 45,
    "averageSpeed": 1.1
  },
  "ai": {
    "questionsAsked": 28,
    "averageRating": 4.7
  }
}
```

## ⚠️ Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "Book with ID 'book_123' not found",
    "details": {
      "bookId": "book_123",
      "userId": "user_789"
    },
    "timestamp": "2024-01-15T11:30:00Z"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` (401): Invalid or missing JWT token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMITED` (429): Too many requests
- `TTS_QUOTA_EXCEEDED` (429): TTS usage limit reached
- `INVALID_FILE` (400): Unsupported file format
- `PROCESSING_ERROR` (500): Audio generation failed

## 🔐 Authentication

All authenticated endpoints require a valid Clerk JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Get tokens from Clerk's frontend SDK after user login.

## 🚀 Rate Limiting

- **Public endpoints**: 60 requests per minute
- **Authenticated endpoints**: 300 requests per minute  
- **TTS generation**: 10 requests per minute per user
- **File uploads**: 5 requests per minute per user

Rate limit headers included in responses:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1642234800
```

---

**Last Updated**: Phase 1 preparation  
**Version**: 1.0.0-alpha