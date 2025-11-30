import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { getUserByUsername, getUserWithDistricts, updateUserLastLogin } from '../storage-auth';
import { createSession, removeSession } from './session';
import { verifyPassword } from './password';
import { generateToken, blacklistToken, verifyToken, isTokenBlacklisted } from './jwt';
import { loginRateLimit } from './middleware';
import { validateSession } from './session';

const router = Router();

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    // Validate request body
    const { username, password } = loginSchema.parse(req.body);

    // Find user by username
    const user = await getUserByUsername(username);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user with districts
    const userWithDistricts = await getUserWithDistricts(user.id);
    if (!userWithDistricts) {
      return res.status(401).json({ error: 'User data error' });
    }

    // Create new session (removes any existing session for single login)
    const sessionToken = await createSession(user.id);

    // Update last login timestamp
    await updateUserLastLogin(user.id);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role as 'ADMIN' | 'OFFICE' | 'DISTRICT_SUPERVISOR',
      districts: userWithDistricts.districts,
      sessionToken,
    });

    // Set HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Return user info (without sensitive data)
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        districts: userWithDistricts.districts,
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.auth_token;
    
    if (token) {
      // Add token to blacklist
      await blacklistToken(token);
      
      // Remove session if user is identified
      const decoded = verifyToken(token);
      if (decoded) {
        await removeSession(decoded.userId);
      }
    }

    // Clear cookie
    res.clearCookie('auth_token');
    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/verify
router.get('/verify', async (req, res) => {
  try {
    const token = req.cookies?.auth_token;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
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

    // Validate session
    const sessionValid = await validateSession(decoded.userId, decoded.sessionToken);
    if (!sessionValid) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Get current user data
    const userWithDistricts = await getUserWithDistricts(decoded.userId);
    if (!userWithDistricts || !userWithDistricts.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({
      user: {
        id: userWithDistricts.id,
        username: userWithDistricts.username,
        role: userWithDistricts.role,
        districts: userWithDistricts.districts,
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({ error: 'Token verification failed' });
  }
});

// Development endpoints (only in development mode)
if (process.env.NODE_ENV === 'development') {
  // GET /api/auth/dev/status
  router.get('/dev/status', (req, res) => {
    res.json({
      authEnabled: process.env.AUTHENTICATION_ENABLED,
      environment: process.env.NODE_ENV,
      devMode: process.env.AUTHENTICATION_ENABLED === 'false'
    });
  });

  // POST /api/auth/dev/toggle
  router.post('/dev/toggle', (req, res) => {
    const { enabled } = req.body;
    process.env.AUTHENTICATION_ENABLED = enabled ? 'true' : 'false';
    
    res.json({ 
      authEnabled: process.env.AUTHENTICATION_ENABLED,
      message: `Authentication ${enabled ? 'enabled' : 'disabled'} (restart required for full effect)`
    });
  });
}

export { router as authRoutes };