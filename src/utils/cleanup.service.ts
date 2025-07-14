import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger';
import { config } from '../config/environment';
import { epubService } from '../services/epub.service';
import { audioCacheService } from '../services/audio-cache.service';

export class CleanupService {
  private isRunning = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 3600000); // 1 hour

    // Run initial cleanup after 5 minutes
    setTimeout(() => {
      this.runCleanup();
    }, 300000); // 5 minutes

    logger.info('🧹 Cleanup service started');
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    logger.info('🧹 Cleanup service stopped');
  }

  private async runCleanup() {
    try {
      logger.info('🧹 Starting scheduled cleanup...');

      await Promise.all([
        this.cleanupTempFiles(),
        this.cleanupOrphanedFiles(),
        epubService.cleanupTempFiles(),
        audioCacheService.cleanupExpiredFiles(),
      ]);

      logger.info('🧹 Scheduled cleanup completed');
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }

  private async cleanupTempFiles() {
    try {
      const tempDir = path.join(config.uploadPath, 'temp');
      const files = await fs.readdir(tempDir).catch(() => []);
      const oneHourAgo = Date.now() - 3600000;

      let deletedCount = 0;
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          logger.warn(`Failed to delete temp file ${file}:`, error);
        }
      }

      if (deletedCount > 0) {
        logger.info(`🗑️ Deleted ${deletedCount} temp files`);
      }
    } catch (error) {
      logger.warn('Failed to cleanup temp files:', error);
    }
  }

  private async cleanupOrphanedFiles() {
    try {
      // This would require database queries to find orphaned files
      // For now, just log that we would do this cleanup
      logger.debug('🔍 Orphaned file cleanup would run here');
    } catch (error) {
      logger.warn('Failed to cleanup orphaned files:', error);
    }
  }

  async emergencyCleanup() {
    try {
      logger.info('🚨 Running emergency cleanup...');
      
      // Clean all temp files regardless of age
      const tempDir = path.join(config.uploadPath, 'temp');
      const files = await fs.readdir(tempDir).catch(() => []);
      
      for (const file of files) {
        try {
          await fs.unlink(path.join(tempDir, file));
        } catch (error) {
          logger.warn(`Failed to delete temp file ${file}:`, error);
        }
      }

      // Clear audio cache
      audioCacheService.clearCache();

      logger.info('🚨 Emergency cleanup completed');
    } catch (error) {
      logger.error('Emergency cleanup failed:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.cleanupInterval,
    };
  }
}

export const cleanupService = new CleanupService();