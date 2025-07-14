import axios from 'axios'
import { Book, QAResponse, UserProgress } from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const AI_API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

const aiApi = axios.create({
  baseURL: AI_API_BASE,
  timeout: 60000,
})

// Backend API calls
export const backendApi = {
  // EPUB Upload
  async uploadEpub(file: File, userId: string): Promise<{ bookId: string }> {
    const formData = new FormData()
    formData.append('epub', file)
    formData.append('userId', userId)
    
    const response = await api.post('/api/upload/epub', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // TTS Generation
  async generateTTS(bookId: string, chapterId: string, options: {
    provider: 'google' | 'azure' | 'amazon'
    voiceId: string
    speed?: number
  }): Promise<{ audioFileId: string }> {
    const response = await api.post(`/api/tts/books/${bookId}/audio/generate`, {
      chapterId,
      ...options
    })
    return response.data
  },

  // Audio Streaming
  getAudioStreamUrl(audioFileId: string): string {
    return `${API_BASE}/api/audio/stream/${audioFileId}`
  },

  // User Progress
  async saveProgress(bookId: string, progress: Partial<UserProgress>): Promise<void> {
    await api.put(`/api/progress/${bookId}/progress`, progress)
  },

  async getProgress(bookId: string): Promise<UserProgress | null> {
    try {
      const response = await api.get(`/api/progress/${bookId}/progress`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  // User Profile
  async getUserProfile(): Promise<any> {
    const response = await api.get('/api/auth/me')
    return response.data
  }
}

// AI Service API calls
export const aiServiceApi = {
  // EPUB Processing
  async processEpub(file: File): Promise<Book> {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await aiApi.post('/process-epub', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (error: any) {
      // Handle staged deployment gracefully
      if (error.response?.status === 503) {
        throw new Error('AI service is still initializing. Please try again in a moment.')
      }
      throw error
    }
  },

  // Text Processing
  async processText(
    text: string,
    ttsProvider: 'google' | 'azure' | 'amazon',
    voiceSettings?: any
  ): Promise<any> {
    const response = await aiApi.post('/process-text', {
      text,
      tts_provider: ttsProvider,
      voice_settings: voiceSettings
    })
    return response.data
  },

  // Question & Answer
  async askQuestion(
    question: string,
    bookId: string,
    contextLimit: number = 5
  ): Promise<QAResponse> {
    try {
      const response = await aiApi.post('/qa', {
        question,
        book_id: bookId,
        context_limit: contextLimit,
        include_citations: true
      })
      return response.data
    } catch (error: any) {
      // Handle staged deployment gracefully
      if (error.response?.status === 503) {
        throw new Error('AI service is still initializing. Please try again in a moment.')
      }
      if (error.response?.data?.error?.includes('available in Stage')) {
        throw new Error('Q&A feature is being deployed. Please check back soon.')
      }
      throw error
    }
  },

  // Text-Audio Synchronization
  async createSyncMapping(
    bookId: string,
    chapterId: string,
    audioDuration: number,
    textSegments: any[]
  ): Promise<any> {
    const response = await aiApi.post('/sync', {
      book_id: bookId,
      chapter_id: chapterId,
      audio_duration: audioDuration,
      text_segments: textSegments
    })
    return response.data
  },

  async getSyncData(bookId: string, chapterId: string): Promise<any> {
    const response = await aiApi.get(`/sync/${bookId}/${chapterId}`)
    return response.data
  },

  // Generate Embeddings
  async generateEmbeddings(bookId: string, content: string): Promise<void> {
    await aiApi.post('/embeddings', {
      book_id: bookId,
      content
    })
  }
}

// Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Backend API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('AI Service API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)