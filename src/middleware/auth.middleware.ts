import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { prisma } from '../database/client';
import { logger } from '../utils/logger';
import { createError } from './errorHandler';
// Auth configuration will be loaded when needed

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        email: string;
        firstName?: string;
        lastName?: string;
      };
    }
  }
}

// Initialize Clerk with secret key
// Note: Clerk auth will be configured when environment variables are available
const clerkAuth = ClerkExpressRequireAuth();
const clerkWithAuth = ClerkExpressWithAuth();

// Middleware to require authentication
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use Clerk's auth middleware
    clerkAuth(req, res, async (err) => {
      if (err) {
        logger.warn('Authentication failed:', err.message);
        return next(createError('Authentication required', 401));
      }

      // Get Clerk user ID from the authenticated request
      const clerkUserId = (req as any).auth?.userId;
      
      if (!clerkUserId) {
        return next(createError('Invalid authentication token', 401));
      }

      try {
        // Get or create user in our database
        let user = await prisma.user.findUnique({
          where: { clerkUserId },
        });

        if (!user) {
          // Get user details from Clerk
          const clerkUser = (req as any).auth?.user;
          
          // Create user in our database
          user = await prisma.user.create({
            data: {
              clerkUserId,
              email: clerkUser?.emailAddresses?.[0]?.emailAddress || `user_${clerkUserId}@bookequalizer.com`,
              firstName: clerkUser?.firstName || null,
              lastName: clerkUser?.lastName || null,
            },
          });

          logger.info(`New user created: ${user.email} (${user.id})`);
        }

        // Attach user to request
        req.user = {
          id: user.id,
          clerkId: user.clerkUserId,
          email: user.email,
          ...(user.firstName && { firstName: user.firstName }),
          ...(user.lastName && { lastName: user.lastName }),
        };

        next();
      } catch (dbError) {
        logger.error('Database error during authentication:', dbError);
        next(createError('Authentication database error', 500));
      }
    });
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next(createError('Authentication error', 500));
  }
};

// Optional authentication middleware (doesn't fail if not authenticated)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    clerkWithAuth(req, res, async () => {
      const clerkUserId = (req as any).auth?.userId;
      
      if (clerkUserId) {
        try {
          const user = await prisma.user.findUnique({
            where: { clerkUserId },
          });

          if (user) {
            req.user = {
              id: user.id,
              clerkId: user.clerkUserId,
              email: user.email,
              ...(user.firstName && { firstName: user.firstName }),
              ...(user.lastName && { lastName: user.lastName }),
            };
          }
        } catch (dbError) {
          logger.warn('Database error during optional auth:', dbError);
          // Continue without user context
        }
      }

      next();
    });
  } catch (error) {
    logger.warn('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
};

// Middleware to check if user owns a resource
export const requireResourceOwnership = (resourceType: 'book' | 'reading_session') => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const { bookId, sessionId } = req.params;
      let owned = false;

      switch (resourceType) {
        case 'book':
          if (bookId) {
            // Check if user has access to this book (through reading sessions)
            const session = await prisma.readingSession.findFirst({
              where: {
                userId: req.user.id,
                bookId,
              },
            });
            owned = !!session;
          }
          break;

        case 'reading_session':
          if (sessionId) {
            const session = await prisma.readingSession.findFirst({
              where: {
                id: sessionId,
                userId: req.user.id,
              },
            });
            owned = !!session;
          }
          break;
      }

      if (!owned) {
        return next(createError('Access denied to this resource', 403));
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check failed:', error);
      next(createError('Authorization check failed', 500));
    }
  };
};

// Admin role middleware
export const requireAdmin = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    // Check if user has admin role (you can customize this logic)
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdmin = adminEmails.includes(req.user.email);

    if (!isAdmin) {
      logger.warn(`Admin access denied for user: ${req.user.email}`);
      return next(createError('Admin access required', 403));
    }

    next();
  } catch (error) {
    logger.error('Admin check failed:', error);
    next(createError('Admin authorization failed', 500));
  }
};

// Rate limiting based on user authentication status
export const authBasedRateLimit = (
  authenticatedLimit: number = 100,
  unauthenticatedLimit: number = 10
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const limit = req.user ? authenticatedLimit : unauthenticatedLimit;
    
    // Set dynamic rate limit based on auth status
    (req as any).rateLimit = {
      limit,
      remaining: limit,
    };

    next();
  };
};

// User context logging middleware
export const logUserContext = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user) {
    logger.debug(`Request from user: ${req.user.email} (${req.user.id})`);
  } else {
    logger.debug(`Anonymous request from: ${req.ip}`);
  }
  next();
};