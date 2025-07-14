import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

// Cache for tracking usage costs per user (1 hour TTL)
const costTracker = new NodeCache({ stdTTL: 3600 });

// Rate limits for different audio operations
export const audioStreamingLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 audio streams per 15 minutes per IP
  message: {
    error: 'Too many audio streaming requests. Please wait before streaming more audio.',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for cached audio (ETag matches)
    const ifNoneMatch = req.headers['if-none-match'];
    return !!ifNoneMatch;
  },
});

export const ttsGenerationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 TTS generations per hour per IP
  message: {
    error: 'TTS generation limit exceeded. Maximum 20 generations per hour.',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const costLimitMiddleware = (maxCostPerHour: number = 1.00) => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id || req.ip; // Use user ID if authenticated, otherwise IP
      const currentHour = Math.floor(Date.now() / 3600000); // Current hour as key
      const costKey = `cost_${userId}_${currentHour}`;
      
      // Get current cost for this hour
      const currentCost = costTracker.get<number>(costKey) || 0;
      
      // Estimate cost for this request
      let estimatedCost = 0;
      if (req.body?.text) {
        // TTS request - estimate based on text length
        const characters = req.body.text.length;
        estimatedCost = (characters / 1000000) * 8; // Average $8 per 1M characters
      }
      
      // Check if this request would exceed the limit
      if (currentCost + estimatedCost > maxCostPerHour) {
        logger.warn(`Cost limit exceeded for ${userId}: $${currentCost + estimatedCost} > $${maxCostPerHour}`);
        return res.status(429).json({
          error: 'Cost limit exceeded',
          currentCost,
          maxCost: maxCostPerHour,
          retryAfter: 3600, // 1 hour
        });
      }
      
      // Store the estimated cost for tracking
      req.estimatedCost = estimatedCost;
      req.costKey = costKey;
      
      next();
    } catch (error) {
      logger.error('Cost limit middleware error:', error);
      next(); // Continue on error to avoid blocking requests
    }
  };
};

export const updateCostTracking = (req: any, actualCost: number) => {
  try {
    if (req.costKey) {
      const currentCost = costTracker.get<number>(req.costKey) || 0;
      costTracker.set(req.costKey, currentCost + actualCost);
      
      logger.debug(`Cost updated for ${req.costKey}: +$${actualCost} = $${currentCost + actualCost}`);
    }
  } catch (error) {
    logger.error('Failed to update cost tracking:', error);
  }
};

// Bandwidth limiting for audio streaming
export const bandwidthLimitMiddleware = (maxMbpsPerUser: number = 5) => {
  const bandwidthTracker = new NodeCache({ stdTTL: 60 }); // 1 minute windows
  
  return (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id || req.ip;
      const currentMinute = Math.floor(Date.now() / 60000);
      const bandwidthKey = `bandwidth_${userId}_${currentMinute}`;
      
      // Track bandwidth usage
      const currentUsage = bandwidthTracker.get<number>(bandwidthKey) || 0;
      const maxBytesPerMinute = maxMbpsPerUser * 1024 * 1024 / 8 * 60; // Convert Mbps to bytes/minute
      
      if (currentUsage > maxBytesPerMinute) {
        return res.status(429).json({
          error: 'Bandwidth limit exceeded',
          maxMbps: maxMbpsPerUser,
          retryAfter: 60,
        });
      }
      
      // Hook into response to track actual bytes sent
      const originalSend = res.send;
      const originalEnd = res.end;
      
      res.send = function(data: any) {
        if (data) {
          const bytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
          bandwidthTracker.set(bandwidthKey, currentUsage + bytes);
        }
        return originalSend.call(this, data);
      };
      
      res.end = function(data: any) {
        if (data) {
          const bytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
          bandwidthTracker.set(bandwidthKey, currentUsage + bytes);
        }
        return originalEnd.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Bandwidth limit middleware error:', error);
      next(); // Continue on error
    }
  };
};

// Audio quality based rate limiting
export const qualityBasedLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    const quality = req.query.quality || req.body?.quality;
    switch (quality) {
      case 'high': return 20; // Stricter limit for high quality
      case 'medium': return 50;
      case 'low': return 100;
      default: return 50;
    }
  },
  message: (req: any) => ({
    error: `Quality-based rate limit exceeded for ${req.query.quality || 'medium'} quality`,
    retryAfter: 15 * 60,
  }),
});

// Export cost tracking utilities
export const getCostStats = () => {
  const keys = costTracker.keys();
  const stats = {
    totalUsers: keys.length,
    costs: keys.map(key => ({
      key,
      cost: costTracker.get<number>(key) || 0,
    })),
  };
  
  return stats;
};

export const resetCostTracking = () => {
  costTracker.flushAll();
  logger.info('Cost tracking reset');
};