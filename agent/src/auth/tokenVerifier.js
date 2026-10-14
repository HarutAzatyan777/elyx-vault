import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
// A fresh secret per process when no operator secret is supplied. No predictable fallback.
const processSecret = randomBytes(32).toString('hex');
const key = (explicit) =>
  explicit || process.env.AGENT_SECRET_KEY || processSecret;
export function verifySessionToken(token, secretKey, expectedDeviceId) {
  if (!token) return { valid: false, error: 'Authorization token is missing' };
  try {
    const decoded = jwt.verify(token, key(secretKey), {
      algorithms: ['HS256'],
      issuer: 'elyx-agent',
      audience: 'elyx-terminal',
    });
    if (
      !decoded.uid ||
      !decoded.deviceId ||
      !decoded.deviceRecordId ||
      !decoded.exp ||
      (expectedDeviceId && decoded.deviceId !== expectedDeviceId)
    )
      return { valid: false, error: 'Invalid session claims' };
    return { valid: true, payload: decoded };
  } catch {
    return { valid: false, error: 'Invalid or expired session token' };
  }
}
export function generateSessionToken(payload, secretKey, expiresIn = '5m') {
  return jwt.sign(payload, key(secretKey), {
    expiresIn,
    issuer: 'elyx-agent',
    audience: 'elyx-terminal',
    algorithm: 'HS256',
  });
}
