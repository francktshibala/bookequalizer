import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/bookequalizer',
  
  // Authentication
  clerkSecretKey: process.env.CLERK_SECRET_KEY || '',
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  
  // TTS APIs
  googleCloudApiKey: process.env.GOOGLE_CLOUD_API_KEY || '',
  azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION || '',
  
  // File Storage
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  audioPath: process.env.AUDIO_PATH || './audio',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000', 10), // 50MB
  
  // Audio Settings
  defaultVoice: process.env.DEFAULT_VOICE || 'en-US-Standard-A',
  audioCacheTtl: parseInt(process.env.AUDIO_CACHE_TTL || '2592000', 10), // 30 days
  
  // Performance
  maxConcurrentTts: parseInt(process.env.MAX_CONCURRENT_TTS || '3', 10),
  audioStreamingBufferSize: parseInt(process.env.AUDIO_STREAMING_BUFFER_SIZE || '1048576', 10), // 1MB
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
} as const;

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'CLERK_SECRET_KEY'] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}