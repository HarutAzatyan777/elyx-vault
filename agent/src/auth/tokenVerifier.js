import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

export function verifySessionToken(token, secretKey) {
  if (!token) {
    return { valid: false, error: 'Authorization token is missing' };
  }

  try {
    const secret = secretKey || process.env.AGENT_SECRET_KEY || 'elyx-default-development-secret-key-32-chars';
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    if (!decoded.uid || !decoded.deviceId) {
      return { valid: false, error: 'Token is missing required claims (uid or deviceId)' };
    }

    return { valid: true, payload: decoded };
  } catch (err) {
    logger.warn('Token verification failed', { error: err.message });
    return { valid: false, error: err.message || 'Invalid or expired session token' };
  }
}

export function generateSessionToken(payload, secretKey, expiresIn = '4h') {
  const secret = secretKey || process.env.AGENT_SECRET_KEY || 'elyx-default-development-secret-key-32-chars';
  return jwt.sign(payload, secret, { expiresIn });
}
