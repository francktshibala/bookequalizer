'use client'

import { useState, useRef, useEffect } from 'react'
import { Book, Chapter, QAResponse } from '@/types'
import { aiServiceApi } from '@/lib/api'
import { Send, Sparkles, Loader2, MessageCircle, BookOpen, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIChatProps {
  book: Book
  currentChapter: Chapter
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: any[]
  confidence?: number
}

export default function AIChat({ book, currentChapter }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello! I'm your AI reading companion for "${book.title}". Ask me anything about the book's content, characters, themes, or plot. I can help you understand and analyze what you're reading!`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [contextLimit, setContextLimit] = useState(5)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await aiServiceApi.askQuestion(
        input.trim(),
        book.id,
        contextLimit
      )

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        confidence: response.confidence
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error: any) {
      console.error('AI Chat error:', error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error while processing your question. Please try again or rephrase your question.",
        timestamp: new Date(),
        confidence: 0
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const formatConfidence = (confidence: number) => {
    if (confidence >= 0.8) return { text: 'High', color: 'text-green-600' }
    if (confidence >= 0.6) return { text: 'Medium', color: 'text-yellow-600' }
    return { text: 'Low', color: 'text-red-600' }
  }

  const getSuggestedQuestions = () => [
    "What are the main themes in this book?",
    "Who are the main characters?",
    "What happened in this chapter?",
    "Can you summarize the plot so far?",
    "What literary devices are used here?"
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1 bg-purple-100 rounded">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <p className="text-sm text-gray-600">
          Ask questions about "{book.title}"
        </p>
        
        {/* Settings */}
        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-gray-500">Context:</label>
          <select
            value={contextLimit}
            onChange={(e) => setContextLimit(parseInt(e.target.value))}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value={3}>Basic (3)</option>
            <option value={5}>Detailed (5)</option>
            <option value={10}>Comprehensive (10)</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn(
            'flex gap-3',
            message.type === 'user' ? 'justify-end' : 'justify-start'
          )}>
            {message.type === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
            )}
            
            <div className={cn(
              'max-w-[80%] p-3 rounded-lg',
              message.type === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-900'
            )}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              
              {/* Confidence and Sources for AI messages */}
              {message.type === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.confidence !== undefined && (
                      <span className={cn('font-medium', formatConfidence(message.confidence).color)}>
                        {formatConfidence(message.confidence).text} confidence
                      </span>
                    )}
                  </div>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
                        </summary>
                        <div className="mt-1 space-y-1">
                          {message.sources.slice(0, 3).map((source, index) => (
                            <div key={index} className="p-2 bg-gray-50 rounded border-l-2 border-blue-200">
                              <div className="flex items-start gap-1">
                                <Quote className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-gray-700 leading-tight">
                                  {source.textPreview}
                                </p>
                              </div>
                              <div className="mt-1 text-gray-500">
                                Similarity: {(source.similarityScore * 100).toFixed(0)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {message.type === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            </div>
            <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">Suggested questions:</p>
          <div className="space-y-1">
            {getSuggestedQuestions().slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => setInput(question)}
                className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about characters, themes, plot, or anything else..."
              className="w-full p-3 pr-12 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute bottom-2 right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>{input.length}/500</span>
          </div>
        </form>
      </div>
    </div>
  )
}