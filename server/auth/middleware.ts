import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken, isTokenBlacklisted } from './jwt';
import { validateSession } from './session';
import { getUserWithDistricts } from '../storage-auth';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: 'ADMIN' | 'OFFICE' | 'DISTRICT_SUPERVISOR';
        districts: string[];
      };
    }
  }
}

// Rate limiting for login attempts  
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false, // Disable proxy validation for Replit
    xForwardedForHeader: false, // Disable X-Forwarded-For header validation
  },
});

// Authentication middleware with development bypass
export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  // Development bypass
  if (process.env.AUTHENTICATION_ENABLED === 'false') {
    req.user = {
      id: 1,
      username: 'dev-user',
      role: 'ADMIN',
      districts: [] // Full access in dev mode
    };
    return next();
  }

  try {
    // Extract token from cookies
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token invalidated' });
    }

    // Verify JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Validate session (single login enforcement)
    const sessionValid = await validateSession(decoded.userId, decoded.sessionToken);
    if (!sessionValid) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Get user with current districts
    const user = await getUserWithDistricts(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role as 'ADMIN' | 'OFFICE' | 'DISTRICT_SUPERVISOR',
      districts: user.districts
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Authorization middleware - check roles
export const authorize = (allowedRoles: Array<'ADMIN' | 'OFFICE' | 'DISTRICT_SUPERVISOR'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip authorization in development bypass mode
    if (process.env.AUTHENTICATION_ENABLED === 'false') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// District access validation middleware
export const validateDistrictAccess = (req: Request, res: Response, next: NextFunction) => {
  // Skip district validation in development bypass mode
  if (process.env.AUTHENTICATION_ENABLED === 'false') {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // ADMIN and OFFICE have access to all districts
  if (req.user.role === 'ADMIN' || req.user.role === 'OFFICE') {
    return next();
  }

  // DISTRICT_SUPERVISOR: Add district filtering to request
  if (req.user.role === 'DISTRICT_SUPERVISOR') {
    // Add districts filter to request for use in queries
    req.body.allowedDistricts = req.user.districts;
    req.query.allowedDistricts = req.user.districts.join(',');
  }

  next();
};