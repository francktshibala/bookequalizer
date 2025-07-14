'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Book, Chapter, SyncData, UserProgress } from '@/types'
import { backendApi } from '@/lib/api'
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Settings, Loader2, AlertTriangle 
} from 'lucide-react'
import { formatTime, cn } from '@/lib/utils'

interface AudioPlayerProps {
  book: Book
  chapter: Chapter
  onProgressUpdate: (progress: Partial<UserProgress>) => void
  syncData?: SyncData
}

export default function AudioPlayer({ 
  book, 
  chapter, 
  onProgressUpdate,
  syncData 
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // Initialize audio when chapter changes
  useEffect(() => {
    if (chapter.audioFileId) {
      loadAudio()
    } else {
      generateAudio()
    }
  }, [chapter.id])

  // Update progress and sync highlighting
  useEffect(() => {
    if (syncData && currentTime > 0) {
      const currentSegment = syncData.timestamps.find(
        timestamp => currentTime >= timestamp.startTime && currentTime <= timestamp.endTime
      )
      
      if (currentSegment && currentSegment.segmentId !== currentSegmentId) {
        setCurrentSegmentId(currentSegment.segmentId)
        
        // Scroll to highlighted segment
        const element = document.getElementById(currentSegment.segmentId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [currentTime, syncData, currentSegmentId])

  const loadAudio = async () => {
    if (!chapter.audioFileId || !audioRef.current) return

    try {
      setIsLoading(true)
      setError(null)
      
      const audioUrl = backendApi.getAudioStreamUrl(chapter.audioFileId)
      audioRef.current.src = audioUrl
      
      audioRef.current.load()
    } catch (err: any) {
      setError('Failed to load audio')
      console.error('Audio loading error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAudio = async () => {
    if (!chapter.content) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Generate TTS audio
      const result = await backendApi.generateTTS(book.id, chapter.id, {
        provider: 'google',
        voiceId: 'en-US-Studio-M', // Default voice
        speed: playbackRate
      })
      
      // Update chapter with audio file ID
      chapter.audioFileId = result.audioFileId
      
      // Load the generated audio
      await loadAudio()
      
    } catch (err: any) {
      setError('Failed to generate audio')
      console.error('TTS generation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Play error:', err)
        setError('Failed to play audio')
      })
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const handleRateChange = (newRate: number) => {
    setPlaybackRate(newRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate
    }
  }

  const skipBack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, currentTime - 10)
    }
  }

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, currentTime + 10)
    }
  }

  // Audio event handlers
  const handleLoadedData = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime
      setCurrentTime(time)
      
      // Update reading progress
      onProgressUpdate({
        audioPosition: time,
        characterPosition: calculateCharacterPosition(time)
      })
    }
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const calculateCharacterPosition = (time: number): number => {
    if (!syncData) return 0
    
    const currentSegment = syncData.timestamps.find(
      timestamp => time >= timestamp.startTime && time <= timestamp.endTime
    )
    
    if (currentSegment) {
      const segment = chapter.segments?.find(s => s.id === currentSegment.segmentId)
      return segment?.startChar || 0
    }
    
    return 0
  }

  const getProgress = () => {
    return duration > 0 ? (currentTime / duration) * 100 : 0
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-t border-red-200">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
          <button 
            onClick={() => chapter.audioFileId ? loadAudio() : generateAudio()}
            className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-t border-gray-200 shadow-lg">
      <audio
        ref={audioRef}
        onLoadedData={handleLoadedData}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="px-6 py-4">
        {/* Progress Bar */}
        <div className="mb-4">
          <div 
            ref={progressRef}
            className="w-full h-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-150"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Skip Back */}
            <button 
              onClick={skipBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isLoading}
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* Play/Pause */}
            <button 
              onClick={handlePlayPause}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50"
              disabled={isLoading || !audioRef.current?.src}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>

            {/* Skip Forward */}
            <button 
              onClick={skipForward}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isLoading}
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            {/* Playback Rate */}
            <select
              value={playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2x</option>
            </select>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-gray-600" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>

        {/* Chapter Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{chapter.title}</span>
            {currentSegmentId && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                Segment highlighted
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}