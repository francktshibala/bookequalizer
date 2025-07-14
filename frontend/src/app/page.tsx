'use client'

import { useState } from 'react'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { BookOpen, Headphones, Sparkles, Upload } from 'lucide-react'
import BookUpload from '@/components/BookUpload'
import { Book } from '@/types'

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([])

  const handleBookUploaded = (book: Book) => {
    setBooks(prev => [...prev, book])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">BookEqualizer</h1>
            <p className="text-sm text-gray-600">AI Reading Companion</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <SignedOut>
          {/* Landing Page */}
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
                Transform Books into
                <span className="text-blue-600"> Intelligent Audio</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Upload any EPUB and experience synchronized reading with AI-powered audio,
                real-time highlighting, and intelligent Q&A about your content.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="p-6 bg-white rounded-xl shadow-sm border">
                <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-4">
                  <Headphones className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Audio Synchronization</h3>
                <p className="text-gray-600">
                  Real-time text highlighting synced with high-quality TTS audio
                </p>
              </div>
              
              <div className="p-6 bg-white rounded-xl shadow-sm border">
                <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">AI-Powered Q&A</h3>
                <p className="text-gray-600">
                  Ask questions about your books and get intelligent, contextual answers
                </p>
              </div>
              
              <div className="p-6 bg-white rounded-xl shadow-sm border">
                <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-4">
                  <Upload className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
                <p className="text-gray-600">
                  Simply upload your EPUB files and start your enhanced reading experience
                </p>
              </div>
            </div>

            <SignInButton mode="modal">
              <button className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors">
                Get Started Free
              </button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          {/* User Dashboard */}
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Library</h2>
              <p className="text-gray-600">Upload and manage your books with AI-enhanced reading</p>
            </div>

            {/* Book Upload */}
            <div className="mb-8">
              <BookUpload onBookUploaded={handleBookUploaded} />
            </div>

            {/* Books Grid */}
            {books.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map((book) => (
                  <div key={book.id} className="p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        book.status === 'ready' ? 'bg-green-100 text-green-700' :
                        book.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {book.status}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{book.title}</h3>
                    {book.author && (
                      <p className="text-gray-600 mb-2">by {book.author}</p>
                    )}
                    <p className="text-sm text-gray-500 mb-4">
                      {book.chapters.length} chapters • {book.totalSegments} segments
                    </p>
                    
                    {book.status === 'ready' && (
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Start Reading
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No books yet</h3>
                <p className="text-gray-600">Upload your first EPUB to get started</p>
              </div>
            )}
          </div>
        </SignedIn>
      </main>
    </div>
  )
}
