'use client'

import { useState, useEffect, useRef } from 'react'
import { Book, Chapter, ReadingMode, UserProgress } from '@/types'
import { Settings, BookOpen, Type, Palette, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReadingInterfaceProps {
  book: Book
  chapter: Chapter
  readingMode: ReadingMode
  onReadingModeChange: (mode: ReadingMode) => void
  onProgressUpdate: (progress: Partial<UserProgress>) => void
  progress: UserProgress | null
}

export default function ReadingInterface({
  book,
  chapter,
  readingMode,
  onReadingModeChange,
  onProgressUpdate,
  progress
}: ReadingInterfaceProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleModeChange = (mode: 'text' | 'audio' | 'hybrid') => {
    onReadingModeChange({ ...readingMode, mode })
  }

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(12, Math.min(24, readingMode.fontSize + delta))
    onReadingModeChange({ ...readingMode, fontSize: newSize })
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'sepia') => {
    onReadingModeChange({ ...readingMode, theme })
  }

  const getThemeClasses = () => {
    switch (readingMode.theme) {
      case 'dark':
        return 'bg-gray-900 text-gray-100'
      case 'sepia':
        return 'bg-amber-50 text-amber-900'
      default:
        return 'bg-white text-gray-900'
    }
  }

  const renderTextContent = () => {
    if (!chapter.segments || chapter.segments.length === 0) {
      // Fallback: render plain text split by paragraphs
      return chapter.content.split('\n\n').map((paragraph, index) => (
        <p 
          key={index}
          className="mb-4 leading-relaxed"
          style={{ fontSize: `${readingMode.fontSize}px` }}
        >
          {paragraph}
        </p>
      ))
    }

    // Render segmented content for highlighting
    return chapter.segments.map((segment) => (
      <span
        key={segment.id}
        id={segment.id}
        className={cn(
          'inline transition-colors duration-200',
          highlightedSegmentId === segment.id && 'bg-yellow-200 dark:bg-yellow-800'
        )}
        style={{ fontSize: `${readingMode.fontSize}px` }}
      >
        {segment.text}{' '}
      </span>
    ))
  }

  return (
    <div className={cn('flex-1 flex flex-col', getThemeClasses())}>
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{book.title}</h1>
            <p className="text-sm opacity-70">{chapter.title}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Reading Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => handleModeChange('text')}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors',
                  readingMode.mode === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleModeChange('audio')}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors',
                  readingMode.mode === 'audio'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleModeChange('hybrid')}
                className={cn(
                  'px-3 py-1 rounded text-sm transition-colors',
                  readingMode.mode === 'hybrid'
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <BookOpen className="w-3 h-3" />
                <Volume2 className="w-3 h-3 -ml-1" />
              </button>
            </div>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium mb-2">Font Size</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFontSizeChange(-2)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Type className="w-3 h-3" />
                  </button>
                  <span className="text-sm min-w-[3rem] text-center">{readingMode.fontSize}px</span>
                  <button
                    onClick={() => handleFontSizeChange(2)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Type className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <div className="flex gap-2">
                  {[
                    { value: 'light', label: 'Light', color: 'bg-white border-2' },
                    { value: 'dark', label: 'Dark', color: 'bg-gray-900 border-2' },
                    { value: 'sepia', label: 'Sepia', color: 'bg-amber-50 border-2' }
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => handleThemeChange(theme.value as any)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        theme.color,
                        readingMode.theme === theme.value
                          ? 'border-blue-500 scale-110'
                          : 'border-gray-300 hover:scale-105'
                      )}
                      title={theme.label}
                    />
                  ))}
                </div>
              </div>

              {/* Auto Scroll */}
              <div>
                <label className="block text-sm font-medium mb-2">Auto Scroll</label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={readingMode.autoScroll}
                    onChange={(e) => onReadingModeChange({
                      ...readingMode,
                      autoScroll: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm">Follow audio</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <article
            ref={contentRef}
            className="prose prose-lg max-w-none"
            style={{ 
              fontSize: `${readingMode.fontSize}px`,
              lineHeight: 1.7
            }}
          >
            {renderTextContent()}
          </article>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm opacity-70">
          <span>Chapter {chapter.index + 1} of {book.chapters.length}</span>
          <span>{chapter.wordCount} words</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div 
            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
            style={{ width: '25%' }} // This would be calculated based on progress
          />
        </div>
      </div>
    </div>
  )
}