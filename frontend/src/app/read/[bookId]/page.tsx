'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Book, Chapter, ReadingMode, UserProgress } from '@/types'
import ReadingInterface from '@/components/ReadingInterface'
import AudioPlayer from '@/components/AudioPlayer'
import AIChat from '@/components/AIChat'
import { backendApi } from '@/lib/api'
import { BookOpen, Loader2, AlertCircle } from 'lucide-react'

export default function ReadPage() {
  const { bookId } = useParams()
  const [book, setBook] = useState<Book | null>(null)
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [readingMode, setReadingMode] = useState<ReadingMode>({
    mode: 'text',
    autoScroll: true,
    fontSize: 16,
    theme: 'light'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (bookId) {
      loadBookData(bookId as string)
    }
  }, [bookId])

  const loadBookData = async (id: string) => {
    try {
      setLoading(true)
      
      // In a real app, you'd fetch the book from your backend
      // For now, we'll create a mock book
      const mockBook: Book = {
        id,
        title: 'Sample Book',
        author: 'Sample Author',
        chapters: [
          {
            id: 'chapter-1',
            title: 'Chapter 1: The Beginning',
            index: 0,
            content: `This is the beginning of our sample book. It contains multiple paragraphs to demonstrate the reading interface.

The text is broken into segments that can be highlighted and synchronized with audio playback. Each segment represents a sentence or logical unit of text.

This paragraph shows how the interface handles longer text content. The reading experience is designed to be smooth and engaging, with options for different reading modes and customization.`,
            segments: [
              {
                id: 'seg-1',
                text: 'This is the beginning of our sample book.',
                startChar: 0,
                endChar: 43,
                sentenceIndex: 0
              },
              {
                id: 'seg-2', 
                text: 'It contains multiple paragraphs to demonstrate the reading interface.',
                startChar: 44,
                endChar: 112,
                sentenceIndex: 1
              }
            ],
            wordCount: 87,
            characterCount: 485
          }
        ],
        totalSegments: 2,
        uploadDate: new Date().toISOString(),
        status: 'ready'
      }

      setBook(mockBook)
      setCurrentChapter(mockBook.chapters[0])

      // Load user progress
      const userProgress = await backendApi.getProgress(id)
      if (userProgress) {
        setProgress(userProgress)
        setReadingMode(userProgress.readingMode)
      }

    } catch (err: any) {
      console.error('Error loading book:', err)
      setError(err.message || 'Failed to load book')
    } finally {
      setLoading(false)
    }
  }

  const handleProgressUpdate = async (newProgress: Partial<UserProgress>) => {
    if (!book) return

    const updatedProgress: UserProgress = {
      bookId: book.id,
      chapterId: currentChapter?.id || '',
      characterPosition: newProgress.characterPosition || 0,
      audioPosition: newProgress.audioPosition || 0,
      lastUpdated: new Date().toISOString(),
      readingMode: newProgress.readingMode || readingMode
    }

    setProgress(updatedProgress)
    
    // Save to backend
    try {
      await backendApi.saveProgress(book.id, updatedProgress)
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  const handleReadingModeChange = (newMode: ReadingMode) => {
    setReadingMode(newMode)
    handleProgressUpdate({ readingMode: newMode })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your book...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Book</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!book || !currentChapter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Book not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Main Reading Area */}
        <div className="flex-1 flex flex-col">
          <ReadingInterface
            book={book}
            chapter={currentChapter}
            readingMode={readingMode}
            onReadingModeChange={handleReadingModeChange}
            onProgressUpdate={handleProgressUpdate}
            progress={progress}
          />
          
          {/* Audio Player */}
          {(readingMode.mode === 'audio' || readingMode.mode === 'hybrid') && (
            <AudioPlayer
              book={book}
              chapter={currentChapter}
              onProgressUpdate={handleProgressUpdate}
              syncData={currentChapter.syncData}
            />
          )}
        </div>

        {/* AI Chat Sidebar */}
        <div className="w-80 border-l bg-white">
          <AIChat 
            book={book}
            currentChapter={currentChapter}
          />
        </div>
      </div>
    </div>
  )
}