import { randomBytes } from 'node:crypto';
import { authorizeFirebaseRequest } from './auth/authorizeFirebase.js';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';
import { deviceIdentity } from './devices/deviceIdentity.js';
import { rateLimiter } from './security/rateLimiter.js';
import {
  verifySessionToken,
  generateSessionToken,
} from './auth/tokenVerifier.js';
import { ptyManager } from './terminal/ptyManager.js';

export function createAgentServer(config = {}) {
  const app = express();
  const allowedOrigins = config.allowedOrigins || [];
  const authorize =
    config.authorizeRequest ||
    ((token, record, device) =>
      authorizeFirebaseRequest(
        token,
        record,
        device,
        config.authorizedUserIds || [],
      ));
  app.use(express.json({ limit: '16kb' }));
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, !origin || allowedOrigins.includes(origin)),
    }),
  );
  const authenticate = async (req, res, next) => {
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin))
      return res.status(403).json({ error: 'Origin denied' });
    if (rateLimiter.isRateLimited(req.socket.remoteAddress || 'unknown'))
      return res.status(429).json({ error: 'Too many requests' });
    try {
      const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      req.identity = await authorize(
        token,
        req.body?.deviceRecordId || req.headers['x-elyx-device-id'],
        deviceIdentity.getIdentity().deviceId,
      );
      next();
    } catch {
      res
        .status(403)
        .json({
          error: 'Firebase authentication and device authorization required',
        });
    }
  };

  const port = config.port || process.env.PORT || 9090;
  const allowedDirectories = config.allowedDirectories || [
    process.cwd(),
    'D:\\VAHAG\\elyx-vault\\elyx-vault',
    'D:\\VAHAG\\malongo',
  ];
  const maxConcurrentSessions = config.maxConcurrentSessions || 3;

  // In-memory enrollment challenges
  const activeChallenges = new Map();

  /* -------------------------------------------------------------------------- */
  /* HTTP ENDPOINTS                                                            */
  /* -------------------------------------------------------------------------- */

  // 1. Health check & agent metadata
  app.get('/health', (req, res) => {
    const identity = deviceIdentity.getIdentity();
    res.json({
      status: 'online',
      version: '1.0.0',
      deviceId: identity.deviceId,
      deviceName: identity.name,
      platform: identity.platform,
      arch: identity.arch,
      activeSessions: ptyManager.getActiveSessionsCount(),
      allowedDirectoriesCount: allowedDirectories.length,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Allowed directories whitelist for frontend selection
  app.get('/api/directories', authenticate, (req, res) => {
    res.json({
      directories: allowedDirectories.map((dirPath) => {
        const exists = fs.existsSync(dirPath);
        return {
          id: dirPath,
          path: dirPath,
          name: path.basename(dirPath) || dirPath,
          exists,
        };
      }),
    });
  });

  // 3. Initiate Enrollment Challenge
  app.post('/api/enroll/challenge', authenticate, (req, res) => {
    const challenge = randomBytes(32).toString('hex');
    activeChallenges.set(challenge, {
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    logger.securityAudit('ENROLLMENT_CHALLENGE_CREATED', { challenge });
    res.json({
      status: 'success',
      challenge,
      device: deviceIdentity.getIdentity(),
    });
  });

  // 4. Request Short-Lived Session Auth Token
  app.post('/api/auth/token', authenticate, (req, res) => {
    res.set('Cache-Control', 'no-store');
    const token = generateSessionToken(req.identity);
    res.json({
      status: 'success',
      token,
      expiresIn: '5m',
      deviceId: req.identity.deviceId,
    });
  });

  /* -------------------------------------------------------------------------- */
  /* WEBSOCKET SERVER                                                           */
  /* -------------------------------------------------------------------------- */

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade to WebSocket
  server.on('upgrade', (request, socket, head) => {
    const ip = request.socket.remoteAddress || 'unknown';
    const origin = request.headers.origin || '';

    if (rateLimiter.isRateLimited(ip)) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!rateLimiter.validateOrigin(origin, allowedOrigins)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    if (ptyManager.getActiveSessionsCount() >= maxConcurrentSessions) {
      logger.warn('Max concurrent sessions reached. Rejecting connection', {
        ip,
      });
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws, request) => {
    const urlParams = new URLSearchParams(request.url.replace(/^[^?]*\?/, ''));
    const protocols = (request.headers['sec-websocket-protocol'] || '')
      .split(',')
      .map((value) => value.trim());
    const token = protocols[0] === 'elyx-terminal' ? protocols[1] : null;
    const requestedCwd =
      urlParams.get('cwd') || allowedDirectories[0] || process.cwd();
    const cols = parseInt(urlParams.get('cols') || '80', 10);
    const rows = parseInt(urlParams.get('rows') || '24', 10);

    // Verify authentication token
    const authResult = verifySessionToken(
      token,
      undefined,
      deviceIdentity.getIdentity().deviceId,
    );
    if (!authResult.valid) {
      logger.warn('WebSocket connection rejected: invalid token', {
        error: authResult.error,
      });
      ws.send(JSON.stringify({ type: 'error', message: authResult.error }));
      ws.close(4001, 'Unauthorized');
      return;
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info('WebSocket client connected', {
      sessionId,
      uid: authResult.payload.uid,
    });

    try {
      ptyManager.createSession({
        sessionId,
        cwd: requestedCwd,
        cols,
        rows,
        ws,
        allowedDirectories,
      });

      ws.send(
        JSON.stringify({
          type: 'connected',
          sessionId,
          deviceId: deviceIdentity.getIdentity().deviceId,
          cwd: requestedCwd,
        }),
      );
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
      ws.close(1011, 'Internal Error');
      return;
    }

    // Process incoming WebSocket messages from client
    ws.on('message', (messageRaw) => {
      try {
        const msg = JSON.parse(messageRaw.toString());

        switch (msg.type) {
          case 'input':
            if (typeof msg.data === 'string') {
              ptyManager.writeInput(sessionId, msg.data);
            }
            break;
          case 'resize':
            if (typeof msg.cols === 'number' && typeof msg.rows === 'number') {
              ptyManager.resize(sessionId, msg.cols, msg.rows);
            }
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          default:
            logger.warn('Unknown message type received', { type: msg.type });
            break;
        }
      } catch (err) {
        logger.error('Failed to parse WebSocket message', err);
      }
    });

    const expiration = setTimeout(
      () => ws.close(4001, 'Session expired; reconnect to verify access'),
      Math.max(0, authResult.payload.exp * 1000 - Date.now()),
    );
    expiration.unref?.();
    ws.on('close', (code, reason) => {
      clearTimeout(expiration);
      logger.info('WebSocket client disconnected', {
        sessionId,
        code,
        reason: reason.toString(),
      });
      ptyManager.closeSession(sessionId, 'WebSocket closed');
    });

    ws.on('error', (err) => {
      logger.error('WebSocket error', err, { sessionId });
      ptyManager.closeSession(sessionId, 'WebSocket error');
    });
  });

  return { app, server, port };
}
