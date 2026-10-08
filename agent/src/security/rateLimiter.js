import { logger } from '../utils/logger.js';

class RateLimiter {
  constructor() {
    this.attempts = new Map(); // ip -> array of timestamps
    this.maxAttempts = 10;
    this.windowMs = 60 * 1000; // 1 minute
  }

  isRateLimited(ip) {
    const now = Date.now();
    const timestamps = this.attempts.get(ip) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

    if (validTimestamps.length >= this.maxAttempts) {
      logger.warn('Rate limit exceeded for IP', { ip, attempts: validTimestamps.length });
      return true;
    }

    validTimestamps.push(now);
    this.attempts.set(ip, validTimestamps);
    return false;
  }

  validateOrigin(origin, allowedOrigins = []) {
    if (!origin) return true; // Direct loopback / non-browser requests
    if (!allowedOrigins || allowedOrigins.length === 0) return true;

    const normalized = origin.trim().toLowerCase().replace(/\/$/, '');
    const isAllowed = allowedOrigins.some((allowed) => {
      const normAllowed = allowed.trim().toLowerCase().replace(/\/$/, '');
      return normalized === normAllowed;
    });

    if (!isAllowed) {
      logger.warn('Blocked WebSocket connection with unauthorized origin', { origin });
    }

    return isAllowed;
  }
}

export const rateLimiter = new RateLimiter();
