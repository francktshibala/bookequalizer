'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { aiServiceApi } from '@/lib/api'
import { Book } from '@/types'

interface BookUploadProps {
  onBookUploaded: (book: Book) => void
}

export default function BookUpload({ onBookUploaded }: BookUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.name.endsWith('.epub')) {
      setUploadStatus('error')
      setUploadMessage('Please upload an EPUB file')
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadMessage('Uploading your book...')

    try {
      // Process with AI service
      setUploadStatus('processing')
      setUploadMessage('Processing content and creating segments...')
      
      const processedBook = await aiServiceApi.processEpub(file)
      
      // Generate embeddings for Q&A
      setUploadMessage('Generating embeddings for AI Q&A...')
      const fullContent = processedBook.chapters.map(ch => ch.content).join('\n\n')
      await aiServiceApi.generateEmbeddings(processedBook.id, fullContent)

      setUploadStatus('success')
      setUploadMessage('Book processed successfully!')
      
      onBookUploaded({
        ...processedBook,
        status: 'ready',
        uploadDate: new Date().toISOString()
      })

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadMessage('')
      }, 3000)

    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      setUploadMessage(error.response?.data?.detail || error.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [onBookUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/epub+zip': ['.epub']
    },
    maxFiles: 1,
    disabled: isUploading
  })

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />
      default:
        return <Upload className="w-8 h-8 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'uploading':
      case 'processing':
        return 'border-blue-300 bg-blue-50'
      case 'success':
        return 'border-green-300 bg-green-50'
      case 'error':
        return 'border-red-300 bg-red-50'
      default:
        return isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 ${getStatusColor()}
          ${isUploading ? 'cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50'}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}
          
          <div>
            {uploadStatus === 'idle' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isDragActive ? 'Drop your EPUB here' : 'Upload an EPUB book'}
                </h3>
                <p className="text-gray-600">
                  Drag and drop your EPUB file here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports EPUB format only • Max file size: 50MB
                </p>
              </>
            )}
            
            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Processing Your Book
                </h3>
                <p className="text-blue-700">{uploadMessage}</p>
                <p className="text-sm text-blue-600 mt-2">
                  This may take a few moments...
                </p>
              </>
            )}
            
            {uploadStatus === 'success' && (
              <>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Upload Complete!
                </h3>
                <p className="text-green-700">{uploadMessage}</p>
              </>
            )}
            
            {uploadStatus === 'error' && (
              <>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Upload Failed
                </h3>
                <p className="text-red-700">{uploadMessage}</p>
                <p className="text-sm text-red-600 mt-2">
                  Please try again or contact support
                </p>
              </>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
            <div className="h-full bg-blue-600 animate-pulse" style={{ width: '70%' }} />
          </div>
        )}
      </div>

      {/* Supported features */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <FileText className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700">Text extraction & segmentation</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <Upload className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700">AI-powered content analysis</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <CheckCircle className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700">Ready for audio & Q&A</span>
        </div>
      </div>
    </div>
  )
}