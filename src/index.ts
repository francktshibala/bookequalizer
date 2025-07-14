import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { connectDatabase } from './database/client';
import { databaseService } from './services/database.service';
import { prisma } from './database/client';
import { cleanupService } from './utils/cleanup.service';
import ttsRoutes from './routes/tts.routes';
import audioRoutes from './routes/audio.routes';
import authRoutes from './routes/auth.routes';
import progressRoutes from './routes/progress.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint with database status
app.get('/health', async (_req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'bookequalizer-backend',
      database: dbHealth
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'bookequalizer-backend',
      database: { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ 
    message: 'BookEqualizer API',
    version: '1.0.0',
    features: ['TTS', 'Audio Streaming', 'AI Chat', 'EPUB Processing']
  });
});

// TTS routes
app.use('/api/tts', ttsRoutes);

// Audio streaming and caching routes
app.use('/api/audio', audioRoutes);

// Authentication and user management routes
app.use('/api/auth', authRoutes);

// Reading progress and synchronization routes
app.use('/api/progress', progressRoutes);

// EPUB upload and processing routes
app.use('/api/upload', uploadRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = config.port;

// Startup function
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Make prisma available to routes
    app.locals.prisma = prisma;
    
    // Start cleanup service
    cleanupService.start();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 BookEqualizer Backend running on port ${PORT}`);
      logger.info(`📚 Environment: ${config.nodeEnv}`);
      logger.info(`🔊 Audio features: enabled`);
      logger.info(`🗄️  Database: connected`);
      logger.info(`📤 File uploads: enabled (max ${config.maxFileSize / 1024 / 1024}MB)`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  cleanupService.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  cleanupService.stop();
  process.exit(0);
});

// Start the server
startServer();